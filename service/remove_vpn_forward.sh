#!/bin/bash
# remove_vpn_forward.sh
# Usage: remove_vpn_forward.sh PUBLIC_PORT VPN_IP PRIVATE_PORT

PUBLIC_PORT=$1
VPN_IP=$2
PRIVATE_PORT=$3

iptables -t nat -D PREROUTING -p tcp --dport $PUBLIC_PORT -j DNAT --to-destination $VPN_IP:$PRIVATE_PORT
iptables -D FORWARD -p tcp -d $VPN_IP --dport $PRIVATE_PORT -j ACCEPT
