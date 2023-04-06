
import React, { useState, useEffect } from 'react';
import classNames from 'classnames';
import { IItem } from '../../index';
import Question from '../question';
import Answer from '../answer';
import './index.less';

export interface AnswerProps {
    data: string;
    isDone?: boolean;
    status?: 1 | 2 | 3 | 4;
}

interface IProps {
    data: IItem;
    domScrollFn: () => void;
    onCopy?: (type: 'question' | 'answer') => void;
    onGetScrollSwicth: () => boolean;
    className?: string;
    Question?: ({ data }: { data: string }) => JSX.Element;
    Answer?: ({ data, isDone, status }: AnswerProps) => JSX.Element;
}

const Chat = ({
    data,
    className,
    onCopy,
    domScrollFn,
    onGetScrollSwicth,
    Question: QuestionCom,
    Answer: AnswerCom,
}: IProps) => {
    const { answer, question, isDone, status } = data;

    useEffect(() => {
        if (onGetScrollSwicth()) {
            domScrollFn()
        }
    }, [answer])

    return (
        <div id={data?.id} className={classNames('chat-wrap', className)}>
            {QuestionCom
                ? <QuestionCom data={question} />
                : <Question data={question} onCopy={onCopy} />}
            {
                AnswerCom
                    ? <AnswerCom data={answer} isDone={isDone} status={status} />
                    : <Answer data={answer} isDone={isDone} status={status} onCopy={onCopy} />
            }
        </div>
    )
}

export default Chat;
