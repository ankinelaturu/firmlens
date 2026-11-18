/**
 * Synthetic firmware fixture for FirmLens (public demo only).
 * Matches docs/firmlens-idea.md end-to-end example addresses when linked with
 * fixtures/link/demo_mf_root.ld via fixtures/build-fixtures.sh.
 */
#include <stdbool.h>
#include <stdint.h>

typedef struct {
  uint32_t id;
  uint32_t file_count;
  bool initialized;
} mem_file_metadata;

mem_file_metadata demo_direct;
mem_file_metadata *mf_root;

int firmware_fixture_anchor(void) {
  return (int)(intptr_t)mf_root;
}