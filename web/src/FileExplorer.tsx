import { lazy, Suspense, useEffect, useState } from 'react'
import {
    useQuery,
    useMutation,
    useQueryClient,
    QueryClient,
    QueryClientProvider,
} from '@tanstack/react-query'
import { clsx } from 'clsx'
import { useLocalStorage } from 'usehooks-ts'
import { MdDeleteForever } from "react-icons/md"
import 'react-toastify/dist/ReactToastify.css'
import { ToastContainer, toast } from 'react-toastify'
import { FaDownload } from "react-icons/fa6"
import { FaUpload } from "react-icons/fa6"
import { MdOutlineClose } from "react-icons/md"
import { SERVER } from './App'

const FileEditor = lazy(() => import('./FileEditor'))


interface FilesResult {
    entries: {
        isdir: boolean
        modtime: number
        name: string
        size: number
        perm: string
    }[],
    path: string,
}
interface OpenedFile {
    path: string
    size: number
}
export function FileExplorer() {
    const [quickFilter, setQuickFilter] = useState("")
    const queryClient = useQueryClient()
    const [currentPath, setCurrentPath] = useLocalStorage<string[]>('currentPath', [])

    const [openedFile, setOpenedFile] = useLocalStorage<OpenedFile | null>('openedFile', null)
    const { isFetching: isFetchingFiles, data: filesResult, refetch: refetchFiles, isSuccess } = useQuery<FilesResult>({
        queryKey: ['files', currentPath],
        queryFn: () =>
            fetch(SERVER + `/api/files?path=/${currentPath.join('/')}`)
                .then((res) => res.ok ? res.json() : Promise.reject(new Error('Oh no!')),),
        retry: Infinity,
    })
    const { mutate: mutateDelete } = useMutation({
        mutationFn: (path: string) => {
            return fetch(SERVER + `/api/files/delete?path=${path}`, {
                method: 'POST',
            })
        },
        onSuccess: () => {
            queryClient.refetchQueries({ type: 'active', })
        }
    })
    const { mutate: mutateUpload } = useMutation({
        mutationFn: ({ path, formData }: { path: string, formData: FormData }) => {
            return fetch(SERVER + `/api/files/upload?path=${path}`, {
                method: 'POST',
                body: formData
            })
        },
        onSuccess: () => {
            queryClient.refetchQueries({ type: 'active', })
        }
    })

    useEffect(() => {
        if (isSuccess) {
            document.querySelector('.__SCROLL_TO_THIS__')?.scrollIntoView({ block: 'center', behavior: 'auto', })
        }
    }, [isSuccess])

    return (<>
        <div className="flex items-center gap-4 justify-between sticky top-0 z-40 bg-base-100">
            <div className="mx-8 breadcrumbs  font-mono">
                <ul>
                    { ['/', ...currentPath].map((item, i) => (
                        <li key={ i } ><a className="p-2 min-w-12 flex justify-center items-center" onClick={ () => {
                            setCurrentPath((prev) => prev.slice(0, i))
                            if (currentPath.length === i) {
                                refetchFiles()
                            }
                        } }>{ item }</a></li>
                    )) }
                </ul>
            </div>

            { isFetchingFiles && <span className="loading loading-spinner loading-md" /> }

            <div className={ clsx(
                'flex gap-2 m-2',
            ) }>
                <label className={ clsx(
                    'input input-sm input-bordered flex items-center gap-2',
                    quickFilter && 'input-secondary',
                ) }>
                    <input type="text" className="grow" placeholder="Quick Filter"
                        onChange={ (e) => {
                            setQuickFilter(e.currentTarget.value)
                        } }
                        value={ quickFilter }
                    />
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="h-4 w-4 opacity-70">
                        <path
                            fillRule="evenodd"
                            d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
                            clipRule="evenodd" />
                    </svg>
                </label>

                <input type="file" id='upload-btn'
                    className={ clsx(
                        // 'file-input file-input-bordered file-input-sm w-full max-w-xs m-4',
                    ) }
                    onChange={ (e) => {
                        const file = e.currentTarget.files?.[0] // Get the selected file
                        if (file) {
                            const formData = new FormData()
                            formData.append('file', file)
                            mutateUpload({
                                path: `/${[...currentPath, file.name].join('/')}`,
                                formData,
                            })
                        }
                    } }
                    hidden
                />
                <label htmlFor="upload-btn" className='btn btn-bg-neutral btn-sm'><FaUpload /></label>



            </div>

        </div>


        <div className="overflow-x-auto p-4 rounded">
            <table className="table table-sm table-zebra-zebra  font-mono">
                <thead>
                    <tr>
                        <th></th>
                        <th>Name</th>
                        <th>Size</th>
                        <th>Last Modified</th>
                        <th>Permissions</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        className={ clsx('cursor-pointer select-none', 'hover') }
                        onClick={ () => {
                            setCurrentPath((prev) => prev.slice(0, -1))
                        } }
                    >
                        <th></th>
                        <td className="text-secondary">...</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>

                    </tr>
                    {
                        filesResult?.entries.toSorted((a, b) => {
                            /* Dir first */
                            if (a.isdir && !b.isdir) {
                                return -1
                            } else if (!a.isdir && b.isdir) {
                                return 1
                            } else {
                                return 0
                            }
                        })
                            .filter((entry) => entry.name.toLowerCase().includes(quickFilter.toLowerCase()))
                            .map((entry, index) => {
                                const currentFilePath = `/${[...currentPath, entry.name].join('/')}`
                                const isThisFileOpened = currentFilePath === openedFile?.path
                                function openFile() {
                                    // if (entry.size < 1_000_000) {
                                    //     setOpenedFilePath(currentFilePath)
                                    // } else {
                                    //     toast.error("文件过大", { theme: 'dark', autoClose: 1500, position: 'bottom-right', })
                                    // }
                                    setOpenedFile({
                                        path: currentFilePath,
                                        size: entry.size
                                    })

                                }
                                return (
                                    <tr key={ entry.name }
                                        className={ clsx(
                                            'cursor-pointer', 'hover select-none',
                                            isThisFileOpened && 'outline outline-success rounded',
                                            isThisFileOpened && "__SCROLL_TO_THIS__"
                                        ) }
                                        onPointerDown={ (e) => {
                                            if (e.buttons === 0b1) {
                                                if (entry.isdir) {
                                                    setCurrentPath((prev) => [...prev, entry.name])
                                                } else {
                                                    openFile()
                                                }
                                            }
                                        } }
                                        onPointerEnter={ (e) => {
                                            if (e.buttons === 0b1) {
                                                if (!entry.isdir) {
                                                    openFile()
                                                }
                                            }
                                        } }
                                    >
                                        <th>{ index + 1 }</th>
                                        <td className={ clsx(entry.isdir && 'font-bold text-primary') }>{ entry.name }{ entry.isdir && '/' }</td>
                                        <td>{ entry.size }</td>
                                        <td>{ new Date(entry.modtime).toLocaleString() }</td>
                                        <td>{ entry.perm }</td>
                                        <td>
                                            <button className="btn btn-ghost min-h-0 h-6" onClick={ (e) => {
                                                e.stopPropagation()
                                            } } onPointerDown={ (e) => {
                                                e.stopPropagation()
                                            } }>
                                                <a href={ SERVER + `/api/files/download?path=${currentFilePath}` } target='_blank'>
                                                    <FaDownload />
                                                </a>
                                            </button>
                                            <button className="btn btn-ghost min-h-0 h-6" onClick={ (e) => {
                                                e.stopPropagation()
                                                if (confirm('确认删除 ' + currentFilePath + ' ?')) {
                                                    mutateDelete(currentFilePath)
                                                }
                                            } } onPointerDown={ (e) => {
                                                e.stopPropagation()
                                            } }>
                                                <MdDeleteForever />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })
                    }
                </tbody>
            </table>
        </div >

        {
            openedFile?.path && (() => {
                if (openedFile?.path.match(/\.(png|jpg|ico|bmp)$/i)) {
                    return <ImageViewer path={ openedFile?.path } closeEditor={ () => {
                        setOpenedFile(null)
                    } } />
                } else if (openedFile?.path.match(/\.(mp4|mkv)$/i)) {
                    return <VideoViewer path={ openedFile?.path } closeEditor={ () => {
                        setOpenedFile(null)
                    } } />
                } else {
                    if (openedFile?.size != null && openedFile?.size < 1_000_000) {
                        return (
                            <Suspense fallback={
                                <div className={ clsx(
                                    'fixed right-16 bottom-16',
                                ) }>
                                    <span className="loading loading-spinner loading-md" />
                                </div>
                            }>
                                <FileEditor path={ openedFile?.path } closeEditor={ () => {
                                    setOpenedFile(null)
                                } } />
                            </Suspense>
                        )
                    } else {
                        return <div className={ clsx(
                            'alert-error alert fixed right-12 bottom-12 w-36',
                        ) }>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-6 w-6 shrink-0 stroke-current"
                                fill="none"
                                viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            文件过大
                        </div>
                    }
                }
            })()
        }
        {
            openedFile && <div className={ clsx(
                'fixed bottom-1 right-24 w-1/3',
                '',
            ) }>
                <FileRenamer setOpenedFile={ setOpenedFile } path={ openedFile.path } />

            </div>
        }
    </>)
}



function ImageViewer({ path, closeEditor, }: {
    path: string
    closeEditor: () => void
}) {
    return (
        <div className={ clsx(
            'fixed bottom-8 right-12  max-w-screen-md    ',
            '',
        ) }>
            <img className={ clsx(
                'image',
            ) } src={ SERVER + `/api/files/download?path=${path}` } alt="wer" />
            <button
                className="btn absolute opacity-45 z-40 right-4 top-4 "
                onClick={ () => {
                    closeEditor()
                } }
            ><MdOutlineClose /></button>
        </div>
    )
}

function VideoViewer({ path, closeEditor, }: {
    path: string
    closeEditor: () => void
}) {
    return (
        <div className={ clsx(
            'VideoViewer fixed bottom-8 right-12  max-w-screen-md    ',
            '',
        ) }>
            <video controls autoPlay className={ clsx(
                '',
            ) } src={ SERVER + `/api/files/download?path=${path}` } />
            <button
                className="btn absolute opacity-45 z-40 right-4 top-4 "
                onClick={ () => {
                    closeEditor()
                } }
            ><MdOutlineClose /></button>
        </div>
    )
}

function FileRenamer({ path, setOpenedFile }: {
    path: string
    setOpenedFile: React.Dispatch<React.SetStateAction<OpenedFile | null>>
}) {
    const queryClient = useQueryClient()
    const [isEditing, setIsEditing] = useState(false)
    const [currentContent, setCurrentContent] = useState<string | null>(null)

    const { mutate } = useMutation({
        mutationFn: (newContent: string) => {
            return fetch(SERVER + `/api/files/rename?oldpath=${path}&newpath=${newContent}`, {
                method: 'POST',
            })
        },
        onSuccess: () => {
            setOpenedFile((prev) => {
                return prev && { ...prev, path: displayedContent, }
            })
            queryClient.refetchQueries({ type: 'active', })
        }
    })
    useEffect(() => {
        setCurrentContent(null)
    }, [path])

    const displayedContent = currentContent ?? path ?? ""
    const isEdited = currentContent != null && currentContent !== path


    return (
        isEditing
            ? <input
                type='text'
                id='value'
                value={ displayedContent }
                onChange={ (e) => setCurrentContent(e.currentTarget.value) }
                className={ clsx(
                    'input input-bordered input-sm w-full  font-mono',
                    isEdited && 'input-warning'
                ) }
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
                        setIsEditing(false)
                    }
                } }
                onBlur={ () => {
                    if (!isEdited) {
                        setIsEditing(false)
                    }
                } }
                autoFocus
            />
            : <div className="opacity-50 font-mono" onClick={ (e) => {
                setIsEditing(true)
            } }>{ displayedContent }</div>
    )
}