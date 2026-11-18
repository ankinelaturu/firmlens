#include "../include/app_types.h"

__attribute__((section(".root")))
mem_file_metadata g_root = {1, 0, 0};

__attribute__((section(".pointer")))
mem_file_metadata *mf_root = &g_root;

__attribute__((section(".storage")))
storage_ring_t g_storage_ring = {0, 0, 16, 0};

void storage_tick(void)
{
    g_storage_ring.head += 1;
    if (g_root.initialized) {
        g_root.file_count += 1;
    }
}