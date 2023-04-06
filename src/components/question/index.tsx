import React from 'react';
import classNames from 'classnames';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { authInfo } from '../../utils/authService'
import copyImg from '../../assets/chat-images/copy.png'
import profileImg from '../../assets/chat-images/profile.png';
import './index.less';

interface IProps {
    data: string;
    className?: string;
    onCopy?: (type: 'question' | 'answer') => void;
}

const Question = ({
    data,
    className,
    onCopy
}: IProps) => {
    let parseInfo: any = {};
    try {
        parseInfo = JSON.parse(authInfo.get() || '');
    } catch (error) {
        parseInfo = {
            userProfile: profileImg,
            userName: '小蜜蜂'
        }
    }

    return (
        <div className={classNames('question-wrap', className)}>
            <div className='question-box'>
                <div className='question-avatar'>
                    <img src={parseInfo?.userProfile} className='question-avatar-img' />
                </div>
                <div className='question-right'>
                    <div className="question-content-box">
                        <div className='question-name'>{parseInfo?.userName}</div>
                        <div className='question-content'>{data}</div>
                    </div>
                    <CopyToClipboard
                        text={data}
                        onCopy={() => { onCopy && onCopy('question') }}
                    >
                        <div className="question-icon-box">
                            <img className="question-icon" src={copyImg} />
                        </div>
                    </CopyToClipboard>
                </div>
            </div>
        </div>
    )
}

export default Question;
