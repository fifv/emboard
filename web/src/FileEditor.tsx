import { MdOutlineClose } from "react-icons/md"


import AceEditor from "react-ace"
// import 'ace-builds/esm-resolver'
import 'ace-builds/src-min-noconflict/ext-searchbox'
import 'ace-builds/src-noconflict/mode-sh'
import 'ace-builds/src-noconflict/mode-golang'
import 'ace-builds/src-noconflict/mode-json'
import 'ace-builds/src-noconflict/mode-makefile'
import 'ace-builds/src-noconflict/mode-c_cpp'
import 'ace-builds/src-noconflict/theme-one_dark'
import 'ace-builds/src-noconflict/ext-language_tools'
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import clsx from "clsx"
import { useState, useEffect } from "react"
import { FileReadResult, SERVER } from "./App"

export default function FileEditor({ path, closeEditor }: {
    path: string
    closeEditor: () => void
}) {
    const queryClient = useQueryClient()
    const [currentContent, setCurrentContent] = useState<string | null>(null)

    const { isSuccess, isFetching, isError, data, refetch, } = useQuery<FileReadResult>({
        queryKey: ['files/read', path],
        queryFn: () =>
            fetch(SERVER + `/api/files/read?path=${path}`)
                .then((res) => res.ok ? res.json() : Promise.reject(new Error('Oh no!')),),
    })
    const { mutate } = useMutation({
        mutationFn: (newContent: string) => {
            return fetch(SERVER + `/api/files/write`, {
                method: 'POST',
                body: JSON.stringify({
                    path: path,
                    content: newContent,
                }),
            })
        }
    })
    /* FIXME: is this ok? */
    useEffect(() => {
        setCurrentContent(null)
    }, [path])

    const isEdited = currentContent != null && currentContent !== data?.content
    /**
     * textarea will preserve last value if pass undefined, 
     * so use "" to empty it
     */
    const displayedContent = currentContent ?? data?.content ?? ""

    return (<>
        {
            !isError
                ? <>
                    <div className={ clsx(
                        'fixed bottom-8 right-12 h-3/4 w-1/2  rounded outline-double ',
                        isEdited ? 'outline-warning ' : 'outline-gray-500/50'
                    ) }>
                        <AceEditor
                            placeholder=""
                            mode={ (() => {
                                if (path.endsWith("go")) {
                                    return "golang"
                                } else if (path.match(/(Makefile|.mk)$/)) {
                                    return "makefile"
                                } else if (path.match(/\.(c|cpp|h|hpp|hxx|cxx)$/)) {
                                    return "c_cpp"
                                } else if (path.endsWith("json")) {
                                    return "json"
                                } else {
                                    return "sh"
                                }
                            })() }
                            theme="one_dark"
                            name="blah2"
                            className={ clsx(
                                'w-full h-full  rounded',
                            ) }
                            height=''
                            width=''
                            // onLoad={ this.onLoad }
                            onChange={ (e) => {
                                const newContent = e
                                if (newContent === data?.content) {
                                    setCurrentContent(null)
                                } else {
                                    setCurrentContent(newContent)
                                }
                            } }
                            fontSize={ 16 }
                            lineHeight={ 19 }
                            showPrintMargin={ false }
                            showGutter={ true }
                            highlightActiveLine={ true }
                            value={ displayedContent }
                            setOptions={ {
                                enableBasicAutocompletion: false,
                                enableLiveAutocompletion: false,
                                enableSnippets: false,
                                enableMobileMenu: true,
                                showLineNumbers: true,
                                tabSize: 4,
                            } }
                        />

                        {/* <textarea
                            spellCheck={ false }
                            className={ clsx(
                                'w-full h-full p-4 pr-16 font-mono',
                                // ' rounded outline bg-base-300  shadow-2xl',
                                'textarea textarea-bordered',
                                isEdited && 'textarea-warning'
                            ) }
                            value={ displayedContent }
                            onChange={ (e) => {
                                const newContent = e.currentTarget.value
                                if (newContent === data?.content) {
                                    setCurrentContent(null)
                                } else {
                                    setCurrentContent(newContent)
                                }
                            } }
                        /> */}
                        <button
                            className="btn absolute z-40 right-4 top-4 "
                            onClick={ () => {
                                if (isEdited) {
                                    setCurrentContent(null)
                                } else {
                                    closeEditor()
                                    queryClient.refetchQueries({ type: 'active', })
                                }
                            } }
                        >{ isEdited ? 'Cancel' : <MdOutlineClose /> }</button>
                        {
                            isEdited &&
                            <button className="btn absolute btn-success z-40 right-24 top-4 " onClick={ () => {

                                mutate(currentContent, {
                                    onSuccess: () => {
                                        queryClient.refetchQueries({ type: 'active', })
                                    }
                                })
                                // closeEditor()
                            } }>Save</button>
                        }
                        { isFetching && <span className="absolute z-40 top-4 -translate-x-1/2 left-1/2 loading loading-spinner loading-md" /> }
                    </div>
                </>
                : null
        }
        { isError && <div className="fixed bottom-8 right-12 w-1/2 alert alert-error font-bold flex justify-center items-center">File Reading FAILED</div> }
    </>
    )

}