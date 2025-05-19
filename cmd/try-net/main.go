package main

import (
	"fmt"
	"net"
)

func main() {
	getConnectedNetworkInterfaces()
}

func getConnectedNetworkInterfaces() {

	interfaces, err := net.Interfaces()
	if err != nil {
		return
	}

	for _, iface := range interfaces {
		addrs, err := iface.Addrs()
		if err != nil {
			fmt.Print(fmt.Errorf("localAddresses: %+v", err.Error()))
			continue
		}
		for _, addr := range addrs {
			switch v := addr.(type) {
			case *net.IPAddr:
				fmt.Printf("%v : %s (%s)\n", iface.Name, v, v.IP.DefaultMask())

			case *net.IPNet:
				fmt.Printf("%v : -%s- [%v/%v]\n", iface.Name, v, v.IP, v.Mask)
			}

		}
	}

}
