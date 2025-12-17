#!/bin/bash
# Detects the host machine's network IP address
# Used to pass to Docker containers so they can report the correct IP

# Get all non-loopback IPv4 addresses
candidates=()

# Skip virtual/docker interfaces
skip_interfaces=("docker" "veth" "virbr" "vmnet" "vboxnet" "br-")

while IFS= read -r line; do
    # Parse ip addr output
    if [[ $line =~ inet\ ([0-9.]+)/.+\ ([a-z0-9]+)$ ]]; then
        ip="${BASH_REMATCH[1]}"
        interface="${BASH_REMATCH[2]}"

        # Skip loopback
        if [[ $ip == 127.* ]]; then
            continue
        fi

        # Skip link-local
        if [[ $ip == 169.254.* ]]; then
            continue
        fi

        # Skip virtual interfaces
        skip=false
        for prefix in "${skip_interfaces[@]}"; do
            if [[ $interface == $prefix* ]]; then
                skip=true
                break
            fi
        done

        if [ "$skip" = false ]; then
            candidates+=("$ip")
        fi
    fi
done < <(ip -4 addr show)

# Prioritize common private network ranges
# 1. 192.168.x.x (most common home/office networks)
# 2. 10.x.x.x (common corporate networks)
# 3. 172.16-31.x.x (less common private range)

for ip in "${candidates[@]}"; do
    if [[ $ip == 192.168.* ]]; then
        echo "$ip"
        exit 0
    fi
done

for ip in "${candidates[@]}"; do
    if [[ $ip == 10.* ]]; then
        echo "$ip"
        exit 0
    fi
done

for ip in "${candidates[@]}"; do
    if [[ $ip == 172.* ]]; then
        # Check if in 172.16-31 range
        second=$(echo "$ip" | cut -d. -f2)
        if [ "$second" -ge 16 ] && [ "$second" -le 31 ]; then
            echo "$ip"
            exit 0
        fi
    fi
done

# Fallback to first candidate
if [ ${#candidates[@]} -gt 0 ]; then
    echo "${candidates[0]}"
else
    echo ""
fi
