/**
 * @fileoverview DWARF index for globals with fixed addresses (DWARF 4 subset).
 * @module lib/dwarf/dwarf-index
 */

const { loadElfSections } = require('../elf/sections');
const { readUleb128 } = require('./leb128');
const { readAttribute, locationFromBlock } = require('./forms');
const C = require('./constants');

/**
 * @typedef {object} DwarfMember
 * @property {string} name
 * @property {number} offset
 * @property {TypeRef} type
 */

/**
 * @typedef {object} TypeRef
 * @property {'void'|'int'|'bool'|'pointer'|'struct'|'unknown'} kind
 * @property {number} [byteSize]
 * @property {boolean} [signed]
 * @property {string} [typeName]
 * @property {TypeRef} [pointee]
 * @property {DwarfMember[]} [members]
 */

/**
 * @typedef {object} DwarfVariable
 * @property {string} name
 * @property {number} address
 * @property {number} declLine
 * @property {string} declFile
 * @property {TypeRef} type
 */

/**
 * @param {string} elfPath
 */
function loadDwarfIndex(elfPath) {
  const elf = loadElfSections(elfPath);
  const abbrevBuf = elf.sections.get('.debug_abbrev');
  const info = elf.sections.get('.debug_info');
  const debugStr = elf.sections.get('.debug_str');
  if (!abbrevBuf || !info) {
    throw new Error('ELF missing DWARF sections');
  }

  /** @type {Map<number, Die>} */
  const dies = new Map();
  /** @type {DwarfVariable[]} */
  const variables = [];

  let cuOff = 0;
  while (cuOff < info.length) {
    const unitLength = info.readUInt32LE(cuOff);
    if (unitLength === 0) break;
    const version = info.readUInt16LE(cuOff + 4);
    if (version !== 4 && version !== 5) {
      throw new Error(`Unsupported DWARF version ${version}`);
    }
    const debugAbbrevOff = info.readUInt32LE(cuOff + 6);
    const addrSize = info[cuOff + 10];
    const dieStart = cuOff + 11;
    const dieEnd = cuOff + 4 + unitLength;
    const abbrevs = parseAbbrevAt(abbrevBuf, debugAbbrevOff);
    walkDies(info, dieStart, dieEnd, abbrevs, debugAbbrevOff, addrSize, debugStr, elf.littleEndian, dies, variables, cuOff, null);
    cuOff = dieEnd;
  }

  for (const v of variables) {
    v.type = resolveType(v._typeRefOff, dies);
    delete v._typeRefOff;
  }

  return {
    littleEndian: elf.littleEndian,
    addressSize: /** @type {32|64} */ (elf.wordSize === 64 ? 64 : 32),
    variables,
    byName(name) {
      return variables.filter((v) => v.name === name);
    },
    byDecl(declFile, declLine, name) {
      const norm = normalizePath(declFile);
      return (
        variables.find(
          (v) =>
            v.name === name &&
            v.declLine === declLine &&
            (normalizePath(v.declFile) === norm || basename(v.declFile) === basename(declFile)),
        ) ?? null
      );
    },
  };
}

/** @typedef {{ tag: number, attrs: Record<number, *>, offset: number, cuRefBase: number }} Die */

/**
 * @param {Buffer} info
 * @param {number} p
 * @param {number} end
 * @param {Map<number, object>} abbrevs
 * @param {number} abbrevOffset
 * @param {number} addrSize
 * @param {Buffer|undefined} debugStr
 * @param {boolean} le
 * @param {Map<number, Die>} dies
 * @param {DwarfVariable[]} variables
 * @param {number|null} cuRefBase
 * @returns {number}
 */
/**
 * @param {number|null} parentStructOff
 */
function walkDies(info, p, end, abbrevs, abbrevOffset, addrSize, debugStr, le, dies, variables, cuRefBase, parentStructOff) {
  // cuRefBase = offset of compile unit length field (start of CU header)
  while (p < end) {
    const dieOff = p;
    const { value: abbrevCode, next } = readUleb128(info, p);
    p = next;
    if (abbrevCode === 0) {
      return p;
    }
    const spec = abbrevs.get(abbrevCode);
    if (!spec) {
      throw new Error(`Unknown abbrev ${abbrevCode}`);
    }
  const refBase = cuRefBase ?? dieOff;
    /** @type {Record<number, *>} */
    const attrs = {};
    for (const { attr, form } of spec.attrs) {
      const r = readAttribute(info, p, form, addrSize, debugStr, le);
      p = r.next;
      let val = r.value;
      if (r.isRef) {
        val = refBase + /** @type {number} */ (val);
      }
      attrs[attr] = val;
    }

    const die = { tag: spec.tag, attrs, offset: dieOff, cuRefBase: refBase, members: [] };
    dies.set(dieOff, die);

    if (spec.tag === C.DW_TAG_member && parentStructOff != null) {
      const parent = dies.get(parentStructOff);
      if (parent) {
        const loc = attrs[C.DW_AT_data_member_location];
        let memberOff = 0;
        if (Buffer.isBuffer(loc)) {
          if (loc.length === 1) memberOff = loc[0];
          else {
            const { value, next } = readUleb128(loc, 0);
            if (loc[0] === 0x23) memberOff = readUleb128(loc, 1).value;
            else memberOff = value;
          }
        } else if (typeof loc === 'number') {
          memberOff = loc;
        }
        parent.members.push({
          name: String(attrs[C.DW_AT_name] || '?'),
          offset: memberOff,
          typeRef: attrs[C.DW_AT_type],
        });
      }
    }

    if (spec.tag === C.DW_TAG_variable && attrs[C.DW_AT_name]) {
      const loc = attrs[C.DW_AT_location];
      const addr = locationFromBlock(loc, addrSize, le);
      if (addr != null) {
        const typeRef = attrs[C.DW_AT_type];
        variables.push({
          name: String(attrs[C.DW_AT_name]),
          address: addr,
          declLine: Number(attrs[C.DW_AT_decl_line] || 0),
          declFile: String(attrs[C.DW_AT_decl_file] || ''),
          type: { kind: 'unknown' },
          _typeRefOff: typeof typeRef === 'number' ? typeRef : null,
        });
      }
    }

    const childStruct = spec.tag === C.DW_TAG_structure_type ? dieOff : parentStructOff;
    if (spec.hasChildren) {
      p = walkDies(info, p, end, abbrevs, abbrevOffset, addrSize, debugStr, le, dies, variables, refBase, childStruct);
    }
  }
  return p;
}

/**
 * @param {number|null|undefined} off
 * @param {Map<number, Die>} dies
 * @returns {TypeRef}
 */
function resolveType(off, dies) {
  if (off == null) return { kind: 'unknown' };
  const die = dies.get(off);
  if (!die) return { kind: 'unknown' };

  if (die.tag === C.DW_TAG_typedef) {
    const inner = resolveType(die.attrs[C.DW_AT_type], dies);
    return { ...inner, typeName: die.attrs[C.DW_AT_name] || inner.typeName };
  }

  if (die.tag === C.DW_TAG_base_type) {
    const enc = die.attrs[C.DW_AT_encoding];
    const size = die.attrs[C.DW_AT_byte_size] || 0;
    if (enc === C.DW_ATE_boolean || enc === 0x02) {
      return { kind: 'bool', byteSize: size, typeName: die.attrs[C.DW_AT_name] };
    }
    if (enc === C.DW_ATE_unsigned) {
      return { kind: 'int', byteSize: size, signed: false, typeName: die.attrs[C.DW_AT_name] };
    }
    if (enc === C.DW_ATE_signed) {
      return { kind: 'int', byteSize: size, signed: true, typeName: die.attrs[C.DW_AT_name] };
    }
    return { kind: 'int', byteSize: size, signed: false, typeName: die.attrs[C.DW_AT_name] };
  }

  if (die.tag === C.DW_TAG_pointer_type) {
    const pointee = resolveType(die.attrs[C.DW_AT_type], dies);
    return { kind: 'pointer', byteSize: 4, pointee, typeName: `${pointee.typeName || 'void'}*` };
  }

  if (die.tag === C.DW_TAG_structure_type) {
    const members = (die.members || []).map((m) => ({
      name: m.name,
      offset: m.offset,
      type: resolveType(m.typeRef, dies),
    }));
    const size = die.attrs[C.DW_AT_byte_size] || 0;
    return {
      kind: 'struct',
      byteSize: size,
      typeName: die.attrs[C.DW_AT_name] || 'struct',
      members,
    };
  }

  return { kind: 'unknown', typeName: die.attrs[C.DW_AT_name] };
}

/**
 * @param {TypeRef} t
 */
function unwrap(t) {
  const { typeName, ...rest } = t;
  return rest;
}

/**
 * @param {Buffer} abbrev
 * @param {number} offset
 */
function parseAbbrevAt(abbrev, offset) {
  /** @type {Map<number, {tag:number, hasChildren:boolean, attrs: {attr:number, form:number}[]}>} */
  const map = new Map();
  let p = offset;
  while (p < abbrev.length) {
    const { value: code, next } = readUleb128(abbrev, p);
    p = next;
    if (code === 0) {
      p += 1;
      continue;
    }
    const { value: tag, next: t1 } = readUleb128(abbrev, p);
    p = t1;
    const hasChildren = abbrev[p] === 1;
    p += 1;
    const attrs = [];
    while (p < abbrev.length) {
      const a = readUleb128(abbrev, p);
      const f = readUleb128(abbrev, a.next);
      p = f.next;
      if (a.value === 0 && f.value === 0) break;
      attrs.push({ attr: a.value, form: f.value });
    }
    map.set(code, { tag, hasChildren, attrs });
  }
  return map;
}

function normalizePath(p) {
  return p.replace(/\\/g, '/');
}

/**
 * @param {string} p
 */
function basename(p) {
  const n = normalizePath(p);
  const i = n.lastIndexOf('/');
  return i >= 0 ? n.slice(i + 1) : n;
}

/**
 * @param {string} editorPath
 * @param {string} dwarfPath
 * @param {{from:string,to:string}[]} remaps
 */
function dwarfPathMatchesEditor(editorPath, dwarfPath, remaps) {
  let dwarf = normalizePath(dwarfPath);
  let editor = normalizePath(editorPath);
  for (const { from, to } of remaps) {
    if (dwarf.startsWith(from)) {
      dwarf = to + dwarf.slice(from.length);
      break;
    }
  }
  if (dwarf === editor) return true;
  return basename(dwarf) === basename(editor);
}

module.exports = {
  loadDwarfIndex,
  dwarfPathMatchesEditor,
  normalizePath,
  basename,
};