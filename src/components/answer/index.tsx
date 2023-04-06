import React from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import classNames from "classnames";
import copyImg from "../../assets/chat-images/copy.png";
import logoImg from "../../assets/chat-images/logo.png";
import "./index.less";

interface IProps {
  data: string;
  className?: string;
  isDone?: boolean;
  status?: 1 | 2 | 3 | 4;
  onCopy?: (type: 'question' | 'answer') => void;
}

const Answer = ({ data = "", className, isDone = true, status, onCopy }: IProps) => {
  // status: 1创建提问未开始回答 2回答中 3回答完成 4回答异常
  const statusMap = {
    1: "gray",
    2: "black",
    3: "green",
    4: "red",
    5: "undefi",
  };

  return (
    <div className={classNames("answer-wrap", className)}>
      <div className="answer-box">
        <div className="answer-avatar">
          <img src={logoImg} className="answer-avatar-img" />
        </div>
        <div className="answer-content">
          <div className="answer-text-box">
            <div className="answer-text">
              {data ? data.trim() : ""}
              {!isDone && (
                <div
                  className={classNames(
                    "answer-cursor",
                    statusMap[status || 5]
                  )}
                />
              )}
              {/* <div className={classNames('answer-cursor', statusMap[status || 5])} /> */}
            </div>
          </div>
          <CopyToClipboard
            text={data}
            onCopy={() => { onCopy && onCopy('answer') }}
          >
            <div className="question-icon-box">
              <img className="question-icon" src={copyImg} />
            </div>
          </CopyToClipboard>
        </div>
      </div>
    </div>
  );
};

export default Answer;
