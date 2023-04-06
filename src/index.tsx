import React, { useState, useEffect, useRef, MutableRefObject, useImperativeHandle, forwardRef } from "react";
import classNames from "classnames";
import { uid } from "uid";
import { indexQuestionDetail, chatWS } from "./services/index";
import { authToken } from "./utils/authService";
import Chat from "./components/chat";
import sendImg from "./assets/chat-images/send.png";
import {
    INPUT_EMPTY,
    NOT_LOGIN,
    NET_OFFLINE,
    SERVICE_NOT_RESPONDING,
    QUESTION_FETCH_MAX,
    INSUFFICIENT_BALANCE,
    WS_ERROR
} from './constants/error';
import './index.less';

export interface baseProps {
    httpAPI: string;
    wsAPI: string;
    waitTimer?: number;
    answeringTimer?: number;
    questionFetchCountMax?: number;
    socketHeartbeat?: number;
    questionFetchTimer?: number;
    httpError?: (msg: string) => void;
}

export interface AnswerProps {
    data: string;
    isDone?: boolean;
    status?: 1 | 2 | 3 | 4;
}

export interface HomeProps {
    className?: string;
    userId?: string;
    onError: (errorType: string, msg?: string) => void;
    onCopy?: (type: 'question' | 'answer') => void;
    Question?: ({ data }: { data: string }) => JSX.Element;
    Answer?: ({ data, isDone, status }: AnswerProps) => JSX.Element;
    baseConfig: baseProps;
}
// 定义外部暴露的方法
export interface InnerComponentRef {
    getAllData: () => any[];
}

export interface IItem {
    id: string;
    question: string;
    answer: string;
    timestamp: number;
    isDone?: boolean;
    status?: 1 | 2 | 3 | 4;
}

const Home = forwardRef<InnerComponentRef, HomeProps>((
    { className, userId, onError, onCopy, Question, Answer, baseConfig },
    ref
) => {
    const [chatData, setChatData] = useState<Array<IItem>>([]);
    const [question, setQuestion] = useState("");
    const indexListDOM = useRef(null);
    // scrollRef是个开关，用于控制是否滚动到最底部，默认开启
    const scrollRef = useRef(true);
    // wsRef用于存websocket的send函数
    const wsRef: any = useRef(null);
    // answerRef用于存websocket返回的答案的数组，因为返回顺序可能乱，用index字段进行排序
    const answerRef: any = useRef([]);
    // 用于存questionId，在socket断了之后，用这个id去请求http接口，取问题的答案覆盖到数据队列里
    const questionIdRef: any = useRef("");
    // 用于存websocket的心跳定时器id
    const timerRef: any = useRef(null);
    // 用于存op为status时的返回值
    const statusRef: any = useRef({});
    // 用于存消息发送等待服务端返回的定时器id
    const waitTimerRef: any = useRef(null);
    // 用于存websocket回答过程中的定时器id
    const answeringTimerRef: any = useRef(null);
    // 是否触发了回答中的定时器
    const answeringTimerIsShow: any = useRef(false);
    // question详情接口轮询次数
    const questionFetchCount: MutableRefObject<number> = useRef(0);
    // question详情接口轮询间隔定时器
    const questionFetchTimerRef: MutableRefObject<any> = useRef(null);
    // 输入框输入的问题
    const questionInputRef: MutableRefObject<string> = useRef('');

    const {
        // http请求接口地址
        httpAPI = "",
        // websocket请求接口地址
        wsAPI = "",
        waitTimer = 5, // 后端无响应等待时长 默认5s
        answeringTimer = 3, // websocket message 回复中断等待时长 默认3s
        questionFetchCountMax = 10, // websocket message 回复中断 用http轮询 最大轮询次数 默认10次
        socketHeartbeat = 30, // websocket心跳时间间隔 默认30s
        questionFetchTimer = 3, // question详情接口轮询间隔 默认3s
        httpError = () => {}
    } = baseConfig;

    // useImperativeHandle用于定义ref暴露给父组件的方法 获取全部数据
    useImperativeHandle(ref, () => ({
        getAllData: () => chatData,
    }));

    const domScrollFn = () => {
        // 滚动到最底部函数
        if (!scrollRef.current) {
            // 滚动开关
            return;
        }
        if (indexListDOM.current) {
            const dom = indexListDOM.current as HTMLElement;
            dom.scrollTop = dom.scrollHeight
        }
    };

    const handleSetData = (data: IItem, op: "question" | "answer" | "status") => {
        if (op === "question") {
            setChatData((cData) => {
                return [...cData, data];
            });
            return;
        }
        if (op === "status") {
            const { id, isDone, status } = data;
            setChatData((cData) => {
                return cData.map((item) => {
                    if (item?.id === id) {
                        item.isDone = isDone;
                        item.status = status;
                        return item;
                    }
                    return item;
                });
            });
            return;
        }
        const { id, answer, isDone, status } = data;
        setChatData((cData) => {
            return cData.map((item) => {
                if (item?.id === id) {
                    item.answer = answer;
                    item.isDone = isDone;
                    item.status = status;
                    return item;
                }
                return item;
            });
        });
    };

    const onTextConfirm = () => {
        if (!(question ? question.trim() : "")) {
            onError(INPUT_EMPTY);
            return;
        }
        // 未登录
        if (!authToken.get()) {
            onError(NOT_LOGIN);
            return;
        }
        function onSubmit() {
            // 清空状态值
            statusRef.current = {};
            // 链接websocket
            WsHandshake();
        }
        if (navigator.onLine) {
            onSubmit();
        } else {
            onError(NET_OFFLINE);
        }
    };

    function handleWsSend(params: string) {
        if (wsRef.current) {
            const id = uid();
            const wsParamsObject = userId
                ? {
                    op: "question",
                    webId: id,
                    question: params,
                    userId
                } : {
                    op: "question",
                    webId: id,
                    question: params,
                };
            const data = JSON.stringify(wsParamsObject);
            wsRef.current?.send(data);
            waitTimerRef.current = setTimeout(() => {
                onError(SERVICE_NOT_RESPONDING);
                clearTimeout(waitTimerRef.current);
            }, 1000 * waitTimer);
            answeringTimerIsShow.current = false;

            // 新建一个问题，此时创建答案为空的数据
            answerRef.current = [];
            questionIdRef.current = id;
            handleSetData(
                {
                    id,
                    question,
                    answer: "",
                    timestamp: +new Date(),
                    isDone: statusRef.current?.isDone,
                    status: statusRef.current?.status,
                },
                "question"
            );
        }
    }

    const answeringTimerCallback = () => {
        answeringTimerIsShow.current = true;
        // 如果http返回的answer有值，就切断socket，把http的返回值直接覆盖到对应id的answer字段上
        // 用来处理socket有回复但是回复中断的情况
        const id = questionIdRef.current;
        if (!id) {
            return;
        }
        questionFetchCount.current = 0;
        const onQuestionFetch = async () => {
            questionFetchCount.current = questionFetchCount.current + 1;
            const res = await indexQuestionDetail({ api: httpAPI, id });
            if (res.code === 200) {
                const answer = res?.data?.answer;
                if (answer === null || answer === undefined) {
                    console.log('questionFetchCount.current', questionFetchCount.current);
                    if (questionFetchCount.current >= questionFetchCountMax) {
                        onError(QUESTION_FETCH_MAX);
                        return;
                    }
                    // 如何answer不存在，轮询indexQuestionDetail接口
                    clearTimeout(questionFetchTimerRef.current);
                    questionFetchTimerRef.current = setTimeout(() => {
                        onQuestionFetch();
                    }, 1000 * questionFetchTimer);
                    return;
                }
                if (wsRef.current) {
                    // 关闭socket链接，用http请求回来的答案直接覆盖到对应id上
                    wsRef.current.close();
                    console.log("🚀 ~ file: index.tsx:184 ~ onQuestionFetch ~ close:")
                }
                handleSetData(
                    {
                        id,
                        question: "",
                        answer,
                        timestamp: 0,
                    },
                    "answer"
                );
                return;
            }
            httpError && httpError(res.msg);
        };
        onQuestionFetch();
    }

    function WsHandshake() {
        // 连接socket，处理socket返回的message
        wsRef.current = chatWS({
            wsAPI,
            successFn(res) {
                const {
                    op,
                    webId,
                    question,
                    timestamp,
                    answer,
                    index,
                    message: resMessage,
                    isDone,
                    status,
                } = res;
                if (op === "error") {
                    answerRef.current = [];
                    if (+resMessage === 4201) {
                        onError(INSUFFICIENT_BALANCE);
                        return;
                    }
                    //   ws其他报错
                    onError(WS_ERROR, resMessage);
                    return;
                }
                if (op === "status") {
                    // status: 1创建提问未开始回答 2回答中 3回答完成 4回答异常
                    statusRef.current = {
                        isDone,
                        status,
                    };
                    if (status === 1) {
                        // 服务已响应，创建提问未开始回答
                        clearTimeout(waitTimerRef.current);
                        return;
                    }
                    if (status === 2) {
                        answeringTimerRef.current = setTimeout(
                            answeringTimerCallback,
                            1000 * answeringTimer
                        );
                        return;
                    }
                    if (status === 3 || status === 4) {
                        if (!answeringTimerIsShow.current) {
                            clearTimeout(answeringTimerRef.current);
                        }
                        wsRef.current && wsRef.current.close();
                        statusRef.current = {};
                        handleSetData(
                            {
                                id: webId,
                                isDone,
                                status,
                                question: "",
                                answer: "",
                                timestamp: 0,
                            },
                            "status"
                        );
                    }
                    return;
                }
                if (op === "answer") {
                    // ws返回是答案
                    answerRef.current[index] = answer;
                    handleSetData(
                        {
                            id: webId,
                            question,
                            answer: answerRef.current.filter(Boolean).join(""),
                            timestamp,
                            isDone: statusRef.current?.isDone,
                            status: statusRef.current?.status,
                        },
                        "answer"
                    );
                    // 如果定时器被触发了，就不再执行清除或者重置操作，等待定时器内逻辑执行完
                    if (!answeringTimerIsShow.current) {
                        // 每次answer返回时，先清除上一次的answeringTimerRef，然后新建一个answeringTimerRef
                        clearTimeout(answeringTimerRef.current);
                        answeringTimerRef.current = setTimeout(
                            answeringTimerCallback,
                            1000 * answeringTimer
                        );
                    }
                    return;
                }
            },
            errorFn(err) {

            },
        });
        wsRef.current.addEventListener("open", () => {
            handleWsSend(question ? question.trim() : "");
            setQuestion("");
            // 开启心跳
            clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                wsRef.current?.send("ping");
            }, 1000 * socketHeartbeat);
        });
        wsRef.current.addEventListener("close", (closeEvent: any) =>
            onWsCloseOrError("close", closeEvent)
        );
        wsRef.current.addEventListener("error", (errorEvent: any) =>
            onWsCloseOrError("error", errorEvent)
        );
        return wsRef.current;
    }

    const onWsCloseOrError = (t: string, e: any) => {
        // 当websocket状态是 close 或 error 的时候，取消心跳
        clearInterval(timerRef.current);
    };

    function onOffline() {
        onError(NET_OFFLINE);
    }

    const componentDidMount = () => {
        setQuestion("");
        setChatData([
            {
                id: uid(),
                question: "Hello",
                answer: "你好，我是人工智能大师，什么问题都能回答，快来和我聊天吧！",
                timestamp: 1,
            },
        ]);
        window.addEventListener('offline', onOffline);
    }

    const componentWillUnmount = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        setChatData([]);
        setQuestion("");
        window.removeEventListener('offline', onOffline);
    }

    useEffect(() => {
        componentDidMount();
        return componentWillUnmount;
    }, []);

    return (
        <div className={classNames(["index", className])}>
            <div className="index-list" ref={indexListDOM}>
                {chatData.map((chat, index) => {
                    return (
                        <Chat
                            key={chat.id + index}
                            data={chat}
                            onCopy={onCopy}
                            domScrollFn={domScrollFn}
                            onGetScrollSwicth={() => scrollRef.current}
                            Question={Question}
                            Answer={Answer}
                        />
                    );
                })}
            </div>
            <div className="input-bottom">
                <div className="index-input-box">
                    <input
                        placeholder="试试打字和我聊天吧"
                        className="index-input"
                        value={question}
                        onChange={(e) => {
                            setQuestion(e.target.value);
                        }}
                        onKeyDown={e => {
                            if (e.key === "Enter") {
                                questionInputRef.current = question;
                                onTextConfirm()
                            }
                        }}
                    />
                    <div
                        className={classNames("index-input-right", {
                            active: !!question.length,
                        })}
                    >
                        <img src={sendImg} className="index-send" onClick={onTextConfirm} />
                    </div>
                </div>
            </div>
        </div>
    );
})

export default Home;