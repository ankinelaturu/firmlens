#include "../include/app_types.h"

extern network_stats_t g_network;

__attribute__((section(".peer")))
network_stats_t g_peer_stats = {12, 4, 0, true};

__attribute__((section(".hub")))
network_hub_t g_network_hub = {
    .peers =
        {
            {1, &g_peer_stats},
            {2, &g_network},
            {3, 0},
            {4, &g_peer_stats},
        },
    .active = &g_network,
    .trace = {10, 20, 30, 40, 50, 60, 70, 80},
};

__attribute__((section(".samples")))
int32_t g_adc_samples[APP_TRACE_LEN] = {100, 101, 102, 103, 104, 105, 106, 107};

void hub_tick(void)
{
    g_network_hub.trace[0] += 1;
}