#include "../include/app_types.h"

__attribute__((section(".board")))
board_state_t g_board = {250, 3300, 0};

__attribute__((section(".count")))
uint32_t g_retry_count = 0;

static int board_calibrate_offset;

int board_read_temp_c(void)
{
    return (int)g_board.temperature_c + board_calibrate_offset;
}

void board_set_voltage_mv(uint16_t mv)
{
    g_board.voltage_mv = mv;
}