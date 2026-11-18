#include "../include/app_types.h"

extern network_stats_t g_network;

static uint32_t diag_sample_count;

uint32_t diag_b_report(void)
{
    diag_sample_count += 2;
    return diag_sample_count + g_network.packets_in;
}