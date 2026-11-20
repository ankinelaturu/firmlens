#include "../include/app_types.h"

extern mem_file_metadata *mf_root;
extern network_hub_t g_network_hub;
extern int32_t g_adc_samples[];
extern uint32_t g_retry_count;
extern board_state_t g_board;
extern network_stats_t g_network;

extern void storage_tick(void);
extern void network_on_rx(uint32_t n);
extern uint32_t diag_a_report(void);
extern uint32_t diag_b_report(void);

static uint32_t main_loop_counter;

void _start(void)
{
    uint32_t retry_count = 9;
    (void)retry_count;

    mf_root->file_count = 3;
    mf_root->initialized = 1;
    g_retry_count = 7;
    g_board.uptime_sec = 42;
    g_network.packets_in = 1000;
    g_network.link_up = 1;

    storage_tick();
    network_on_rx(2);
    main_loop_counter = diag_a_report() + diag_b_report();

    retry_count = 11;
    for (;;) {
    }
}