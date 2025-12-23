import { Activity, lazy, Suspense, useEffect, useState } from 'react'
import {
    useQuery,
    useMutation,
    useQueryClient,
    QueryClient,
    QueryClientProvider,
} from '@tanstack/react-query'
import { clsx } from 'clsx'
import { useLocalStorage } from 'usehooks-ts'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import 'react-toastify/dist/ReactToastify.css'
import { ToastContainer, toast } from 'react-toastify'
import { MdOutlineSync } from "react-icons/md"
// import { Shell } from './Shell'
import { FileExplorer } from './FileExplorer'
import { MdMenu } from "react-icons/md"

const Shell = lazy(() => import('./Shell'))



/**
 * TODO:
 * 1. reboot
 * 2. file download
 * 3. network configure
 * 4. http request to other apps
 */

const queryClient = new QueryClient()
export const SERVER = import.meta.env.PROD ? '' : 'http://192.168.56.102:8080'



export interface FileReadResult {
    content: string
    path: string
}

interface StatusResult {
    cpuUsagePercent: number
    deviceName: string
    linuxVersion: string
    memory: {
        free: number
        total: number
        usage: number
        used: number
    }
    network: {
        interface: string
        type: string
        ips: string[]
        mac: string
    }[]
    os: {
        arch: string
        name: string
        version: string
    }
    uptime: string
    time: string
}

export default function App() {
    return (
        <QueryClientProvider client={ queryClient }>
            <ReactQueryDevtools></ReactQueryDevtools>
            <Main />
            <ToastContainer />
        </QueryClientProvider>
    )
}


/**
 * sidebar && tab router
 */
function Main() {
    const [currentPage, setCurrentPage] = useLocalStorage<string>('currentPage', 'home')
    return <>
        <div className="bg-base-100 drawer lg:drawer-open">
            <input id="my-drawer-2" type="checkbox" className="drawer-toggle" />
            <div className="drawer-content">
                <label htmlFor="my-drawer-2" className="btn btn-ghost drawer-button lg:hidden">
                    <MdMenu />
                </label>
                
                {/* <Activity mode={ currentPage === 'home' ? 'visible' : 'hidden' }>
                    <Dashboard />
                </Activity>
                <Activity mode={ currentPage === 'files' ? 'visible' : 'hidden' }>
                    <FileExplorer />
                </Activity>
                <Activity mode={ currentPage === 'shell' ? 'visible' : 'hidden' }>
                    <Suspense fallback={
                        <div className={ clsx(
                            'fixed top-16 left-1/2',
                        ) }>
                            <span className="loading loading-spinner loading-md" />
                        </div>
                    }><Shell /></Suspense>
                </Activity> */}

                { currentPage === 'home' && <Dashboard /> }


                { currentPage === 'files' && <FileExplorer /> }


                { currentPage === 'shell' &&
                    <Suspense fallback={
                        <div className={ clsx(
                            'fixed top-16 left-1/2',
                        ) }>
                            <span className="loading loading-spinner loading-md" />
                        </div>
                    }><Shell /></Suspense>
                }


            </div>
            <div className="drawer-side z-50 bg-base-200-">
                <label htmlFor="my-drawer-2" aria-label="close sidebar" className="drawer-overlay"></label>

                <div className={ clsx(
                    'h-screen text-base-content bg-base-100',
                ) }>

                    <div className="navbar sticky top-0 z-40 bg-base-100">
                        <div data-sveltekit-preload-data="" className="bg-base-100 flex sticky top-0 z-20  items-center gap-2 bg-opacity-90 px-4 py-2 backdrop-blur lg:flex shadow-sm">
                            <a href="/" aria-current="page" aria-label="Homepage" className="flex-0 flex items-center btn btn-ghost px-2">
                                <svg width="32" height="32" viewBox="0 0 415 415" xmlns="http://www.w3.org/2000/svg"><rect x="82.5" y="290" width="250" height="125" rx="62.5" fill="#1AD1A5"></rect><circle cx="207.5" cy="135" r="130" fill="black" fillOpacity=".3"></circle><circle cx="207.5" cy="135" r="125" fill="white"></circle><circle cx="207.5" cy="135" r="56" fill="#FF9903"></circle></svg>
                                <div className="font-title inline-flex text-lg md:text-2xl ">EmBoard</div>
                            </a>
                            <div tabIndex={ 0 } role="button" className="link link-hover inline-block font-mono text-xs">0.0.1</div>
                        </div>
                    </div>
                    <ul className="menu  text-base-content bg-base-100  w-80 p-4">
                        {/* Sidebar content here */ }
                        <li><a className={ clsx(
                            currentPage === 'home' && 'dark:bg-neutral bg-base-300 font-bold',
                        ) } onClick={ () => {
                            setCurrentPage('home')
                        } }>Home</a></li>
                        <li><a className={ clsx(
                            currentPage === 'files' && 'dark:bg-neutral bg-base-300 font-bold',
                        ) } onClick={ () => {
                            setCurrentPage('files')
                        } }>Files</a></li>
                        <li><a className={ clsx(
                            currentPage === 'shell' && 'dark:bg-neutral bg-base-300 font-bold',
                        ) } onClick={ () => {
                            setCurrentPage('shell')
                        } }>Shell</a></li>
                    </ul>


                </div>



            </div>
        </div >
    </>

}

function NetInterface({ iface, type, ip, mac }: {
    iface: string
    type: string
    ip?: string
    mac: string

}) {
    const queryClient = useQueryClient()
    const [currentContent, setCurrentContent] = useState<string | null>(null)
    const displayedContent = currentContent || ip
    const isEdited = currentContent != null && currentContent !== ip
    const { mutate } = useMutation({
        mutationFn: () => {
            return fetch(SERVER + `/api/net/ip?link=${iface}&oldip=${ip}&ip=${currentContent}`, {
                method: 'POST',
            }).then((res) => res.ok ? res.json() : Promise.reject(new Error('Oh no!')),)

        },
        onSuccess: () => {
            queryClient.refetchQueries({ type: 'active', })
            toast.success('成功修改IP地址', { theme: 'dark', autoClose: 1500, position: 'bottom-right', })
        },

    })
    useEffect(() => {
        setCurrentContent(null)
    }, [ip])
    return <div className={ clsx(
        'flex flex-col justify-start items-center  relative'
    ) }>
        <h2 className="card-title">{ iface }</h2>
        <div className="text-sm opacity-70">{ type }</div>
        <div className="text-sm opacity-70">{ mac }</div>
        <div className={ clsx(
            'relative',
        ) }>
            <input
                key={ ip } type="text" placeholder="IP Address" value={ displayedContent }
                className={ clsx(
                    'm-1 input input-sm w-full max-w-x relative',
                    isEdited && 'input-bordered input-warning '
                ) }
                onChange={ (e) => {
                    const newContent = e.currentTarget.value
                    if (newContent === ip) {
                        setCurrentContent(null)
                    } else {
                        setCurrentContent(newContent)
                    }
                } }
                onKeyDown={ (e) => {
                    // e.preventDefault()
                    // e.stopPropagation()

                    if (e.key === 'Enter') {
                        if (isEdited) {
                            const newHostname = displayedContent?.replace(/\/\d+$/, "")
                            const oldHostname = ip?.replace(/\/\d+$/, "")
                            const newHref = location.href.replace(location.hostname, newHostname ?? '')
                            if (location.hostname === oldHostname) {
                                // @ts-expect-error hack
                                document.getElementById('my_modal_1')?.showModal?.()
                                setInterval(() => {
                                    fetch(newHref).then((v) => {
                                        if (v.ok) {
                                            location.href = newHref
                                        }
                                    })
                                }, 500)
                            }
                            mutate(undefined, {
                                onError: () => {
                                    // @ts-expect-error hack
                                    document.getElementById('my_modal_1')?.close?.()
                                    if (location.hostname !== oldHostname) {
                                        toast.error('修改失败', { theme: 'dark', autoClose: 1500, position: 'bottom-right', })
                                    }
                                }
                            })
                        }
                    }
                } }
            />
            {/* {
                isEdited &&
                <button className={ clsx(
                    'btn absolute right-0 top-1/2 -translate-y-1/2  btn-success btn-xs',
                ) } onClick={ () => {

                } }>Save</button>
            } */}
        </div>


        {/* <button className="btn" onClick={ () => document.getElementById('my_modal_1').showModal() }>open modal</button> */ }
        <dialog id="my_modal_1" className="modal" onKeyDown={ (e) => {
            // e.preventDefault()
            // e.stopPropagation()
        } }>
            <div className="modal-box">
                <h3 className="font-bold text-lg">IP Changed...</h3>
                <p className="py-4">Waiting Connection to new Host...</p>
                <div className="modal-action">
                    {/* <form method="dialog">
                        <button className="btn">Close</button>
                    </form> */}
                </div>
            </div>
        </dialog>
    </div>
}
function SkeletonW96() {
    return (
        <div className="flex w-96 flex-col gap-4">
            <div className="skeleton h-32 w-full"></div>
            <div className="skeleton h-4 w-28"></div>
            <div className="skeleton h-4 w-full"></div>
            <div className="skeleton h-4 w-full"></div>
        </div>
    )
}

function Dashboard() {
    const { isSuccess, isFetching: isFetchingStatus, data: statusResult, refetch: refetchStatus, } = useQuery<StatusResult>({
        queryKey: ['status'],
        queryFn: () =>
            fetch(SERVER + `/api/status`)
                .then((res) => res.ok ? res.json() : Promise.reject(new Error('Oh no!')),),
        refetchInterval: 1000,
        retry: Infinity,
    })

    const { mutate: mutateSystime, isPending: isPendingSystime } = useMutation({
        mutationFn: async () => {
            /* UTC Time */
            const res = await fetch(SERVER + `/api/systime?time=${(new Date()).toISOString().replace('T', ' ').slice(0, -5)}`, {
                method: 'POST',
            })
            if (res.ok) {
                return await res.json()
            } else {
                throw await res.json()
            }

        },
        onSuccess: () => {
            queryClient.refetchQueries({ type: 'active', })
            toast.success('成功同步时间', { theme: 'dark', autoClose: 1500, position: 'bottom-right', })
        },
        onError: (e) => {
            console.log(e)
            // @ts-expect-error ???
            toast.error('修改失败: ' + e?.error, { theme: 'dark', autoClose: 1500, position: 'bottom-right', })
        }
    })

    return (<>

        <h1 className="text-4xl font-bold mt-16 ml-8">Overview</h1>

        <div className={ clsx(
            'Cards',
            'flex gap-8 m-8 flex-wrap font-mono',
        ) }>


            {
                /* Info */
                isSuccess
                    ? <div className="card dark:bg-neutral bg-base-300 w-96">
                        <div className="card-body items-center text-center">
                            <h2 className="card-title">{ statusResult.deviceName }</h2>
                            <div>{ statusResult.linuxVersion }</div>
                        </div>
                    </div>
                    : <SkeletonW96 />
            }

            {/* CPU Mem */ }
            <div className="card dark:bg-neutral bg-base-300 w-96">
                <div className="card-body items-center text-center">
                    <div className="card-title"> { statusResult?.uptime }</div>
                    <div className="text-sm opacity-70 leading-none">uptime</div>
                    <div className="flex flex-col items-center justify-center w-96 h-7 m-4">
                        <progress className="progress w-56" value={ statusResult?.cpuUsagePercent } max="100"></progress>
                        <div className="flex w-48 justify-between">
                            <div>CPU</div>
                            <div>{ statusResult?.cpuUsagePercent.toFixed(2) }%</div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center w-96 h-7 m-4">
                        <progress className="progress w-56" value={ statusResult?.memory.used } max={ statusResult?.memory.total }></progress>
                        <div></div>
                        <div className="flex w-48 justify-between">
                            <div>Mem</div>
                            <div>{ ((statusResult?.memory.used ?? 0) / 1024 / 1024).toFixed(0) }MB/{ ((statusResult?.memory.total ?? 1) / 1024 / 1024).toFixed(0) }MB</div>
                        </div>
                    </div>
                </div>
            </div>


            {
                /* TimeDate */
                isSuccess
                    ? <div className="card dark:bg-neutral bg-base-300 p-4">
                        <div className="card-body items-center text-center justify-center">
                            <h2 className="card-title">{ new Date(statusResult.time).toLocaleTimeString() }</h2>
                            <div>{ new Date(statusResult.time).toLocaleDateString() }</div>
                            <button className="btn btn-" onClick={ () => {
                                mutateSystime()
                            } }><MdOutlineSync className={ clsx(
                                isPendingSystime && 'animate-spin',
                            ) } />同步时间</button>
                        </div>
                    </div>
                    : <SkeletonW96 />
            }

            {
                isSuccess
                    ? <div className="card dark:bg-neutral bg-base-300 ">
                        <div className="card-body items-center text-center justify-start flex-row gap-8 flex-wrap">
                            {
                                statusResult?.network.map((link) => (
                                    <NetInterface
                                        key={ link.interface }
                                        iface={ link.interface }
                                        type={ link.type }
                                        mac={ link.mac }
                                        ip={ link.ips[0] }
                                    />
                                ))
                            }
                        </div>
                    </div>
                    : <div className="flex w-full flex-col gap-4">
                        <div className="skeleton h-32 w-full"></div>
                        <div className="skeleton h-4 w-full"></div>
                    </div>
            }



            <Config />



        </div>

        <button className={ clsx(
            'btn btn-error btn-outline fixed top-4 right-4',
            '',
        ) }
            onClick={ () => {
                fetch(SERVER + "/api/reboot", { method: 'POST', })
                    .then((v) => {
                        if (v.ok) {
                            toast.success("开始重启", { theme: 'dark', autoClose: 1500, position: 'bottom-right', })
                            return
                        } else {
                            return v.json() as Promise<{ error: string }>
                        }
                    })
                    .then((v) => {
                        toast.error(v?.error, { theme: 'dark', autoClose: 1500, position: 'bottom-right', })
                    })
            } }
        >Reboot</button>
        {/* <div>{ JSON.stringify(statusResult) }</div> */ }
    </>)

}


interface ConfigResult {
    key: string
    value: any
}
function Config() {
    return (
        <div>
            <div className="card dark:bg-neutral bg-base-300 w-96">
                <div className="card-body items-center text-center">
                    <h2 className="card-title">{ "Options" }</h2>

                    <ConfigToggle />

                    <ConfigString />

                </div>
            </div>
        </div>
    )
}
function ConfigString() {
    const queryClient = useQueryClient()
    const [currentContent, setCurrentContent] = useState<string | null>(null)

    const key = 'ccc'

    const { isSuccess, isFetching, isError, data, refetch, } = useQuery<ConfigResult>({
        queryKey: ['ipc/config', key],
        queryFn: () =>
            fetch(SERVER + `/api/ipc/config?key=${key}`)
                .then((res) => res.ok ? res.json() : Promise.reject(new Error('Oh no!')),),
    })
    const { mutate, isPending } = useMutation({
        mutationFn: (newContent: any) => {
            return fetch(SERVER + `/api/ipc/config?key=${key}`, {
                method: 'POST',
                body: JSON.stringify(
                    newContent
                ),
            })
        },
        onSuccess: () => {
            // queryClient.refetchQueries({ type: 'active', })
            refetch()
            // toast.success('成功修改', { theme: 'dark', autoClose: 1500, position: 'bottom-right', })
        },
    })


    const displayedContent = currentContent ?? data?.value ?? ""
    const isEdited = currentContent != null && currentContent !== data?.value



    return (
        <div className={ clsx(
            'relative m-1  w-full max-w-x',
        ) }>
            <input type="text" placeholder="Type here"
                disabled={ !isSuccess }
                className={ clsx(
                    ' input input-sm w-full',
                    isEdited && 'input-bordered input-warning '
                ) }
                onChange={ (e) => {
                    const newContent = e.currentTarget.value
                    if (newContent === data?.value) {
                        setCurrentContent(null)
                    } else {
                        setCurrentContent(newContent)
                    }
                } }
                onKeyDown={ (e) => {
                    // e.preventDefault()
                    // e.stopPropagation()

                    if (e.key === 'Enter') {
                        if (isEdited) {
                            mutate(displayedContent, {
                                onError: () => {
                                    toast.error('修改失败', { theme: 'dark', autoClose: 1500, position: 'bottom-right', })
                                }
                            })
                        }
                    }
                } }
                value={ displayedContent }

            />
            { (isFetching || isPending) && <span className={ clsx(
                'loading loading-spinner loading-md absolute right-8 top-1/2 -translate-y-1/2',
                isPending && 'text-warning',
            ) } /> }

        </div>
    )
}

interface ConfigResultBool {
    key: string
    value: boolean
}
function ConfigToggle() {
    const queryClient = useQueryClient()
    // const [isChecked, setIsChecked] = useState(true)

    const key = 'ccc.bbb'

    const { isSuccess, isFetching, isError, data, refetch, } = useQuery<ConfigResultBool>({
        queryKey: ['ipc/config', key],
        queryFn: () =>
            fetch(SERVER + `/api/ipc/config?key=${key}`)
                .then((res) => res.ok ? res.json() : Promise.reject(new Error('Oh no!')),),
    })
    const { mutate, variables, isPending } = useMutation({
        mutationFn: (newContent: boolean) => {
            return fetch(SERVER + `/api/ipc/config?key=${key}`, {
                method: 'POST',
                body: JSON.stringify(
                    newContent
                ),
            })
        },
        onSuccess: () => {
            // queryClient.refetchQueries({ type: 'active', })
            refetch()
            // toast.success('成功修改', { theme: 'dark', autoClose: 1500, position: 'bottom-right', })
        },
    })

    return (
        <div className="form-control w-52 relative">
            <label className="label cursor-pointer">
                <span className="label-text">Some Toggle</span>
                <input type="checkbox" className="toggle toggle-accent"
                    checked={ data?.value ?? false }
                    disabled={ !isSuccess }
                    onChange={ (e) => {
                        const newIsChecked = e.currentTarget.checked
                        // setIsChecked(newIsChecked)
                        mutate(newIsChecked, {
                            onError: () => {
                                toast.error('修改失败', { theme: 'dark', autoClose: 1500, position: 'bottom-right', })
                            }
                        })
                    } }
                />
                { (isFetching || isPending) && <span className={ clsx(
                    'loading loading-spinner loading-md absolute -right-8 top-1/2 -translate-y-1/2',
                    isPending && 'text-warning',
                ) } /> }
            </label>
        </div>
    )
}


