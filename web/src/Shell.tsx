import { useEffect, useMemo, useRef, useState } from 'react'
import { ReadyState } from "react-use-websocket"
import useWebSocket from "react-use-websocket"
// import type useWebSocket from "react-use-websocket"

// oxlint-disable-next-line no-explicit-any
// const useWs = (useWebSocket as any).default as typeof useWebSocket
// const useWebSocket = (useWebSocket as any).default 
import '@xterm/xterm/css/xterm.css'
import { useLocalStorage } from 'usehooks-ts'
import { type ITerminalAddon, type ITerminalInitOnlyOptions, type ITerminalOptions, Terminal } from '@xterm/xterm'
import { WebglAddon } from '@xterm/addon-webgl'
import { FitAddon } from '@xterm/addon-fit'
import { SERVER } from './App'
import clsx from 'clsx'

interface WsMessage {
    event: string
    data: {
        message: string
    }
}
interface WsRxMessage {
    event:
    | 'sh-out'
    data: unknown
}



// console.log(typeof useWebSocket, useWebSocket)


function useXterm({ addons, options, listeners }: {
    addons?: ITerminalAddon[]
    options?: ITerminalOptions & ITerminalInitOnlyOptions
    listeners?: {
        onBinary?(data: string): void
        onCursorMove?(): void
        onData?(data: string): void
        onKey?: (event: {
            key: string
            domEvent: KeyboardEvent
        }) => void
        onLineFeed?(): void
        onScroll?(newPosition: number): void
        onSelectionChange?(selection: string): void
        onRender?(event: {
            start: number
            end: number
        }): void
        onResize?(event: {
            cols: number
            rows: number
        }): void
        onTitleChange?(newTitle: string): void
        customKeyEventHandler?(event: KeyboardEvent): boolean
    }
}) {
    const refTerm = useRef<Terminal>(null!)
    const refDiv = useRef<HTMLDivElement>(null!)
    if (refTerm.current == null) {
        refTerm.current = new Terminal({
            fontFamily: 'monospace',
            windowOptions: {

            },
            ...options,
        })
        // console.log(refTerm.current)
    }
    useEffect(() => {
        if (refDiv.current) {
            refTerm.current.open(refDiv.current)
        }
        refTerm.current.loadAddon(new WebglAddon())
        // const fitAddon = new FitAddon()
        // refTerm.current.loadAddon(fitAddon)
        // fitAddon.fit()

        // refTerm.current.write('Hello from \x1B[1;3;31mxterm.js\x1B[0m $ ')
        return () => {
            // refTerm.current.dispose()
        }
    }, [])
    useEffect(() => {
        if (refDiv.current && listeners?.onSelectionChange) {
            const a = refTerm.current.onSelectionChange(() => {
                listeners.onSelectionChange?.(refTerm.current.getSelection())
            })
            return () => {
                a.dispose()
            }
        }
    }, [listeners?.onSelectionChange])


    return {
        xtermRef: refDiv,
        xtermInstance: refTerm.current,
    }
}
function Tick() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 shrink-0 stroke-current"
            fill="none"
            viewBox="0 0 24 24">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    )
}
function Warn() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 shrink-0 stroke-current"
            fill="none"
            viewBox="0 0 24 24">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
    )
}
function Info() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="h-6 w-6 shrink-0 stroke-current">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
    )
}


export default function Shell() {

    const [shouldConnect, setShouldConnect] = useState(true)
    const [message, setMessage] = useState('')
    const [cfarRangeThreshold, setCfarRangeThreshold] = useState(15)
    const [range, setRange] = useState<number[] | null>([])
    const [isShowRange, setIsShowRange] = useLocalStorage('isShowRange', true)
    const [isComOpened, setIsComOpened] = useState(false)
    const [isComSubOpened, setIsComSubOpened] = useState(false)
    const [videoUrl, setVideoUrl] = useState<null | string>(null)
    const [selection, setSelection] = useState('')

    const { xtermInstance, xtermRef } = useXterm({
        options: {
            // rows: 99
        },
        listeners: {
            onSelectionChange: async (selection) => {
                // console.log(selection)
                setSelection(selection)

                /**
                 * hack to copy
                 */
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(selection)
                } else {
                    // Use the 'out of viewport hidden text area' trick
                    const textArea = document.createElement("textarea")
                    textArea.value = selection

                    // Move textarea out of the viewport so it's not visible
                    textArea.style.position = "absolute"
                    textArea.style.left = "-999999px"

                    document.body.prepend(textArea)
                    textArea.select()

                    try {
                        document.execCommand('copy')
                    } catch (error) {
                        console.error(error)
                    } finally {
                        textArea.remove()
                        xtermInstance.focus()
                    }
                }
            }
        },
    })
    const { sendJsonMessage, lastJsonMessage, lastMessage, readyState } = useWebSocket<WsRxMessage | null>(
        SERVER + "/ws",
        {
            share: false,
            shouldReconnect: () => true,
            reconnectInterval: 500,
            reconnectAttempts: Infinity,
        },
        shouldConnect
    )

    const refTerminalWrapper = useRef<HTMLDivElement>(null!)

    /* disconnect when page is not active */
    // useEffect(() => {
    //     function handleVisibilityChange(e: Event) {
    //         if (document.visibilityState === 'hidden') {
    //             setShouldConnect(false)
    //         } else {
    //             setShouldConnect(true)
    //         }
    //     }
    //     document.addEventListener("visibilitychange", handleVisibilityChange)
    //     return () => {
    //         document.removeEventListener("visibilitychange", handleVisibilityChange)
    //     }
    // }, [])

    // Run when the connection state (readyState) changes
    useEffect(() => {
        console.log("Connection state changed", (() => {
            switch (readyState) {
                case ReadyState.UNINSTANTIATED:
                    return "UNINSTANTIATED"
                case ReadyState.CONNECTING:
                    return "CONNECTING"
                case ReadyState.OPEN:
                    return "OPEN"
                case ReadyState.CLOSING:
                    return "CLOSING"
                case ReadyState.CLOSED:
                    return "CLOSED"
                default:
                    return "?"
            }
        })())
        if (readyState === ReadyState.OPEN) {
            sendJsonMessage({
                event: "sh-connect",
                data: null,
            })
        }
    }, [readyState])
    useEffect(() => {
        // console.log('Got a new json message:', lastJsonMessage)
        if (lastJsonMessage?.event === 'sh-out') {
            // xtermInstance?.write(Uint8Array.from(lastJsonMessage.data))
            xtermInstance?.write(lastJsonMessage.data as string)
        } else if (false/* lastJsonMessage?.event === 'com-main-opened' */) {
            /* setIsComOpened(true) */
        }
    }, [lastJsonMessage])
    useEffect(() => {
        // console.log('Got a new message:', lastMessage)
    }, [lastMessage])

    useEffect(() => {
        const dispose = xtermInstance.onData((data) => {
            /* string to bytes to ascii-char-array */
            // console.log([...(new TextEncoder().encode(data))].map((x) => String.fromCharCode(x)))
            sendJsonMessage({
                event: 'sh-in',
                data: data,
            })
            // xtermInstance.write(data)
        })

        return () => {
            dispose.dispose()
            // disposeSub.dispose()
        }
    }, [])

    /**
     * 在Arch上,單行字符溢出後並不會發\n而是只有一個\r
     * 貌似是依賴Terminal自身的溢出換行能力
     * 所以必須讓pty設置正確的size
     */
    useEffect(() => {
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = entry.contentBoxSize[0].blockSize
                const width = entry.contentBoxSize[0].inlineSize
                if (height != null && width != null) {
                    console.log("Resize", "height", height, "fontSize", (xtermInstance.options.fontSize), "width", width,)
                    sendJsonMessage({
                        event: "sh-resize",
                        data: {
                            rows: Math.floor(height / 18),
                            cols: Math.floor(width / 8 - 6),
                            // cols: width / 8,
                            height: height,
                            width: width,
                        }
                    })
                    xtermInstance.resize(
                        Math.floor(
                            width / 8 - 6
                            // 160
                            // / (xtermInstance.options.fontSize ?? 16)
                        ),
                        // width / 8,
                        Math.floor(
                            height / 18
                            // / ((xtermInstance.options.fontSize ?? 16) * (xtermInstance.options.lineHeight ?? 1))
                        )
                    )

                }
                // entry.contentBoxSize[0].blockSize
                // entry.contentBoxSize[0].inlineSize
            }
        })
        observer.observe(xtermRef.current)

        // window.addEventListener("resize", handleResize)
        return () => {
            observer.disconnect()
            // window.removeEventListener("resize", handleResize)
        }
    }, [])

    // useEffect(() => {    
    //     const handleBeforeunload = (e: Event) => {
    //         e.preventDefault()
    //     }
    //     window.addEventListener('beforeunload', handleBeforeunload)
    //     return () => {
    //         window.removeEventListener('beforeunload', handleBeforeunload)
    //     }
    // }, [])


    return (
        <div className="main w-full p-4 h-screen flex flex-col">

            <div className="connectStatus mx-2 flex gap-4 select-none cursor-pointer sticky top-4 z-20" onClick={ () => {
                setShouldConnect((x) => (!x))
            } }>
                {
                    shouldConnect
                        ? <>
                            {
                                readyState === ReadyState.OPEN
                                    ? <div role="alert" className=" alert ">
                                        <Tick />
                                        <span>Server Connected</span>
                                    </div>
                                    : <div role="alert" className=" alert alert-warning">
                                        <Warn />
                                        <span>Server Connecting</span>
                                    </div>
                            }
                        </>
                        : <div role="alert" className="alert shadow-lg shadow-white/10 ">
                            <Info />
                            <div className="font-bold">Disabled</div>
                            <div className="text-xs mx-2">Click To Connect</div>
                        </div>
                }

            </div>

            <div className={ clsx(
                'TerminalsWrapper m-2 flex grow h-0 w-full',
                'rounded outline-double outline-neutral',
                'bg-black p-4'
            ) } ref={ refTerminalWrapper }>
                <div
                    ref={ xtermRef } id="terminal" className={ clsx(
                        'Terminal outline-dotted outline-neutral h-full w-full'
                    ) }
                    onPointerDown={ async (e) => {
                        // console.log('down',e.buttons)
                        if (e.buttons === 0b10) {
                            const pasteText = await (async () => {
                                if (navigator.clipboard && window.isSecureContext) {
                                    return await navigator.clipboard.readText()
                                } else {
                                    /* TODO: paste hack */
                                }
                            })()
                            // xtermInstance.write(pasteText)
                            console.log('pasteText', pasteText,)
                            sendJsonMessage({
                                event: 'com-main-tx',
                                data: pasteText
                            })
                        }
                    } }
                    onContextMenu={ (e) => {
                        e.preventDefault()
                        // console.log('menu')
                    } }
                />
                {/* <div ref={ xtermSubRef } id="terminalSub" className="w-1/3"
                    onPointerDown={ async (e) => {
                        // console.log('down',e.buttons)
                        if (e.buttons === 2) {
                            const pasteText = await navigator.clipboard.readText()
                            console.log('pasteText', pasteText,)
                            sendJsonMessage({
                                event: 'com-sub-tx',
                                data: pasteText
                            })
                        }
                    } }
                    onContextMenu={ (e) => {
                        e.preventDefault()
                        console.log('menu')
                    } }
                /> */}
            </div>

            <div className="EasyButtons flex justify-between ">
                <div className="buttonControls font-mono p-4 flex flex-col gap-4 justify-between">
                    <div className="flex gap-4 items-center">
                        <div className="btn btn-error" onClick={ () => {
                            sendJsonMessage({
                                event: 'sh-in',
                                data: `\x03`,
                            })
                        } } >
                            { '^C' }
                        </div>
                        <div className="btn btn-primary" onClick={ () => {
                            sendJsonMessage({
                                event: 'sh-in',
                                data: `\r`,
                            })
                        } } >
                            { '<Enter>' }
                        </div>
                        <div className="btn btn-error" onClick={ () => {
                            sendJsonMessage({
                                event: 'sh-in',
                                data: `\x04`,
                            })
                        } } >
                            { '<EOF>' }
                        </div>
                        <div className="btn btn-warning btn-outline" onClick={ () => {
                            sendJsonMessage({
                                event: 'sh-in',
                                data: `\x03  reboot  \r`,
                            })
                        } } >
                            { 'Reboot' }
                        </div>
                        <div className="btn btn-primary btn-outline" onClick={ () => {
                            sendJsonMessage({
                                event: 'sh-in',
                                data: `\x03  ls -al  \r`,
                            })
                        } } >
                            { 'ls -al' }
                        </div>
                    </div>
                    <div className="flex gap-4 items-center">
                        {/* <div className="form-control w-">
                            <label className="label cursor-pointer flex flex-col justify-center items-center">
                                <input type="checkbox" className="toggle toggle-primary" checked={ isShowRange } onChange={ (e) => {
                                    setIsShowRange(e.currentTarget.checked)
                                } } />
                                <span className="label-text">Range</span>
                            </label>
                        </div> */}
                    </div>

                </div>
                <textarea
                    className="textarea textarea-bordered w-96" placeholder="若由于浏览器限制无法直接复制粘贴, 请在此粘贴"
                    value={ selection }
                    onChange={ (e) => {
                        if (selection === '') {
                            sendJsonMessage({
                                event: 'sh-in',
                                data: e.currentTarget.value
                            })
                            console.log(e.currentTarget.value)
                        }
                    } }
                />
            </div>







            {/* <div className="mb-96"></div> */ }
        </div >
    )
}
