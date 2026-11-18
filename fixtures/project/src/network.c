#include "../include/app_types.h"

__attribute__((section(".network")))
network_stats_t g_network = {0, 0, 0, false};

void network_on_rx(uint32_t n)
{
    g_network.packets_in += n;
    g_network.link_up = true;
}

void network_on_crc_error(void)
{
    g_network.crc_errors += 1;
}