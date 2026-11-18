#include <stdbool.h>
#include <stdint.h>

typedef struct {
  uint32_t id;
  uint32_t file_count;
  bool initialized;
} mem_file_metadata;

__attribute__((section(".data.mf_root")))
mem_file_metadata *mf_root;

__attribute__((section(".data.demo_direct")))
mem_file_metadata demo_direct;