package main

import (
	"fmt"

	// "github.com/davecgh/go-spew/spew"
	"github.com/vishvananda/netlink"
)

func main() {
	links, err := netlink.LinkList()
	// lo, err := netlink.LinkByName("enp0s8t")
	if err != nil {
		fmt.Println("Error:", err)
	} else {
		for _, link := range links {
			if link.Attrs().Name == "lo" {
				continue
			}

			fmt.Println(link.Type(), link.Attrs().Name, link.Attrs().HardwareAddr)
			addrs, err := netlink.AddrList(link, netlink.FAMILY_V4 /* |netlink.FAMILY_V6 */)
			if err != nil {
				fmt.Println(err)
			}
			for _, addr := range addrs {
				
				fmt.Println(addr.IP, addr.IPNet.String() )
			}
			fmt.Println("")
			// fmt.Printf("%+v\n",link.Attrs())
			// spew.Dump(link)
		}
		// fmt.Println(links)
	}
}
