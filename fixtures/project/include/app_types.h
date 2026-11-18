#ifndef APP_TYPES_H
#define APP_TYPES_H

#include <stdbool.h>
#include <stdint.h>

typedef struct {
    uint32_t id;
    uint32_t file_count;
    bool initialized;
} mem_file_metadata;

typedef struct {
    uint32_t packets_in;
    uint32_t packets_out;
    uint32_t crc_errors;
    bool link_up;
} network_stats_t;

typedef struct {
    uint16_t temperature_c;
    uint16_t voltage_mv;
    uint32_t uptime_sec;
} board_state_t;

typedef struct {
    uint32_t head;
    uint32_t tail;
    uint32_t capacity;
    uint32_t dropped;
} storage_ring_t;

#endif