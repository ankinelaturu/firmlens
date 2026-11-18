#include "../include/app_types.h"

extern uint32_t g_retry_count;

static uint32_t diag_sample_count;

uint32_t diag_a_report(void)
{
    diag_sample_count += 1;
    return diag_sample_count + g_retry_count;
}