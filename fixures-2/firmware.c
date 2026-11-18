typedef unsigned int u32;

typedef struct {
    u32 id;
    u32 file_count;
    _Bool initialized;
} Root;

__attribute__((section(".root"))) Root root = {1, 0, 0};
__attribute__((section(".pointer"))) Root *mf_root = &root;
__attribute__((section(".count"))) u32 retry_count = 0;

void _start(void)
{
    mf_root->file_count = 3;
    mf_root->initialized = 1;
    retry_count = 7;
    for (;;) {}
}
