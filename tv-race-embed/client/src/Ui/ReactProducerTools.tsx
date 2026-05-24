import * as React from "react";
import { asComponent } from "./ReactHelper";
import { Logic } from "../Logic/Logic";
import { RtcLogic } from "../Rtc/RtcLogic";
import { dummyModelKart5 } from "client/LogicImplementationDummy/DummyModelKart5";

interface IProps {}

const Button = (props: { label: string | JSX.Element; onClick?: () => void; onMouseDown?: () => void; onMouseUp?: () => void }) => {
  const { label, onClick, onMouseDown, onMouseUp } = props;
  return (
    <div className="Button" onClick={onClick} onMouseDown={onMouseDown} onMouseUp={onMouseUp}>
      {label}
    </div>
  );
};

export const ReactProducerTools = asComponent("ReactProducerTools", (props: IProps) => {
  const searchParams = new URLSearchParams(window.location.search);
  const [params, setParams] = React.useState(searchParams);
  const paramsRef = React.useRef(params);
  const handleQueryChange = (key: string, val: string) => {
    const updatedQueryParams = new URLSearchParams(params);
    if (val === "") updatedQueryParams.delete(key);
    updatedQueryParams.set(key, val);
    setParams(updatedQueryParams);
    return updatedQueryParams;
  };
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const devTools = Logic.getProducerTools();
  const videoTime = devTools.getObservableTime();
  const handleSpace = (e: any) => {
    if (e.key === " ") {
      Logic.toggleVideoPlay();
    }
  };

  const ESCAPE_KEY = 27;
  const RETURN_KEY = 13;

  const handleKeyDown = (event: { keyCode: number }) => {
    if (event.keyCode === ESCAPE_KEY || event.keyCode === RETURN_KEY) {
      const sParams = new URLSearchParams(paramsRef.current);
      updateQueryParams(sParams);
    }
  };

  React.useEffect(() => {
    document.addEventListener("keyup", handleKeyDown);
    return () => {
      document.removeEventListener("keyup", handleKeyDown);
    };
  }, []);

  React.useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  const updateQueryParams = (newParams?: URLSearchParams) => {
    if (newParams) return (window.location.search = newParams.toString());
    window.location.search = params.toString();
  };

  const handleMouseDown = (change: number) => {
    intervalRef.current = setInterval(() => {
      devTools.setVideoTime(Math.max(devTools.getObservableTime() + change, 0.0));
      console.log("intervall");
    }, 100); // Adjust the interval as needed
  };

  const handleMouseUp = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return (
    <div className="ProducerOuter">
      <div className="ProducerSliderBar">
        <input
          className="ProducerProgressBar"
          tabIndex={1}
          onKeyDown={handleSpace}
          type="range"
          min={0}
          max={Logic.getRaceEndTime()}
          value={videoTime}
          onChange={(event) => devTools.setVideoTime(+event.currentTarget.value)}
        />
        <p>{videoTime.toFixed(2)}</p>
      </div>
      <div className="ButtonRow">
        <Button label={Logic.isVideoPlaying() ? "Stop" : "Play"} onClick={() => Logic.toggleVideoPlay()} />
        <Button label="Prev" onClick={() => devTools.setVideoTime(Math.max(videoTime - 0.0333333, 0.0))} onMouseDown={() => handleMouseDown(-0.033)} onMouseUp={() => handleMouseUp()} />
        <Button label="Next" onClick={() => devTools.setVideoTime(Math.max(videoTime + 0.0333333, 0.0))} onMouseDown={() => handleMouseDown(+0.033)} onMouseUp={() => handleMouseUp()} />
        <Button label="Trigger Fade" onClick={() => devTools.triggerFade()} />
        <Button label="Loose Context" onClick={() => devTools.looseContext()} />
        {RtcLogic.instance.isProducer() && <Button label="Publish" onClick={() => Logic.publish()} />}
        <Button label="Request PauseOverlay Intro" onClick={() => Logic.showPauseOverlay("intro", { bottomText: "Intro", pauseEndTimeText: "CANCELLED " })} />
        <Button label="Request PauseOverlay Race" onClick={() => Logic.showPauseOverlay("race", { bottomText: "Race", pauseEndTimeText: "CANCELLED" })} />
        <Button label="FadeTo PauseOverlay" onClick={() => Logic.showPauseOverlay("immediately", { bottomText: "PROSSIMA GARA", pauseEndTimeText: "12:00" })} />
        <Button label="Remove PauseOverlay" onClick={() => Logic.showPauseOverlay(false)} />
        <Button
          label="FadeTo NoResultOverlay"
          onClick={() =>
            Logic.showPauseOverlay("immediately", {
              bottomText: "Race was cancelled",
              pauseEndTimeText: "CANCELLED",
              nextRaceTime: new Date(Date.now() + 10000),
              nextRound: dummyModelKart5.roundInfo
            })
          }
        />
        <Button
          label="FadeTo NoResultOverlay2"
          onClick={() =>
            Logic.showPauseOverlay("immediately", {
              bottomText: "Race was cancelled",
              pauseEndTimeText: "CANCELLED",
              nextRaceTime: new Date(Date.now() + 10000)
            })
          }
        />
        <Button label="Update Query Params" onClick={() => updateQueryParams()} />
        <Button
          label="Set current Time as start"
          onClick={() => {
            const newParams = handleQueryChange("videoStartTime", videoTime.toString());
            updateQueryParams(newParams);
          }}
        />
      </div>
      <div>
        <h3>Current Game:</h3>
        <div style={{ display: "flex", gap: "1rem" }}>
          <span>{params.get("gameType")}</span>
          <span>{Number(params.get("gameLength")) / 60} min</span>
          {params.get("gameSkin") === "11" && <span>Odds Always On</span>}
          <span>{params.get("showBonus") === "" || params.get("showBonus") === "true" ? "with Bonus" : "no Bonus"}</span>
          <span>{params.get("languageId") === "it" ? "ital. Version" : ""}</span>
        </div>
        <div className="Divider" />
        <h3>Query Parameters:</h3>
        {queryParamWrapper(params, handleQueryChange)}
      </div>
    </div>
  );
});

<style></style>;

const allQueryParams = {
  booleans: [
    {
      name: "showUI",
      default: "false"
    },
    {
      name: "raw",
      default: "false"
    },
    {
      name: "forceDummyLogic",
      default: "false"
    },
    {
      name: "useCache",
      default: "false"
    },
    {
      name: "showBonus",
      default: "false"
    },
    {
      name: "forceReloadContent",
      default: "false"
    },
    {
      name: "useOverlays",
      default: "true"
    },
    {
      name: "startImmediately",
      default: "false"
    },
    {
      name: "showText",
      default: "false"
    },
    {
      name: "showDebug",
      default: "false"
    },
    {
      name: "stopAfterSeek",
      default: "false"
    },
    {
      name: "showDebugTextColor",
      default: "false"
    },
    {
      name: "syncStartTimeParameter",
      default: "false"
    }
  ],
  strings: [
    {
      name: "gameType",
      default: "dog6"
    },
    {
      name: "devUser",
      default: ""
    },
    {
      name: "performance",
      default: "h"
    },
    {
      name: "languageId",
      default: "default"
    } /*,
    {
      name: "forceSpecificIntro",
      default: "intro_4_oao_crf27_gridcheck02"
    }*/
  ],
  numbers: [
    {
      name: "videoStartTime",
      default: "0"
    },
    {
      name: "gameSkin",
      default: "0"
    },
    {
      name: "speed",
      default: "1"
    },
    {
      name: "gameLength",
      default: "300"
    },
    {
      name: "width",
      default: "1400"
    }
  ]
};

function queryParamWrapper(params: URLSearchParams, handleChange: (key: string, value: string) => void) {
  const parsedParams = paramsToObject(params.entries());

  Object.keys(parsedParams).forEach((key) => {
    if (parsedParams[key] === "") {
      parsedParams[key] = "true";
    }
  });
  return (
    <div style={{ display: "flex", gap: "1rem", gridTemplateColumns: "repeat(3, 1fr) fit-content(20%)", width: "max-content" }}>
      <div style={{ columns: "2", width: "max-content" }}>
        {allQueryParams.booleans.map((param) => {
          return InputFields({ key: param.name, value: parsedParams[param.name] || param.default }, handleChange);
        })}
      </div>
      <div style={{ width: "max-content", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {allQueryParams.strings.map((param) => {
          return InputFields({ key: param.name, value: parsedParams[param.name] || param.default }, handleChange);
        })}
      </div>
      <div style={{ width: "max-content", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {allQueryParams.numbers.map((param) => {
          return InputFields({ key: param.name, value: parsedParams[param.name] || param.default }, handleChange);
        })}
      </div>
    </div>
  );
}

function InputFields(params: { [key: string]: string }, handleChange: (paramKey: string, paramVal: string) => void) {
  const key = params.key;
  const value = params.value;

  const isTrue = !value || value === "true";
  if (isTrue || value === "false") {
    return (
      <InputWrapper col={1} key={key}>
        <p>{key}: </p>
        <input onChange={(event) => handleChange(key, String(event?.target.checked))} checked={isTrue} type="checkbox" name="" id="" />
      </InputWrapper>
    );
  }
  const number = parseInt(value, 10);
  if (Number.isNaN(number))
    return (
      <InputWrapper col={2} key={key}>
        {key}
        <input onChange={(event) => handleChange(key, event?.target.value)} value={value} type="text" name="" id="" />
      </InputWrapper>
    );
  else
    return (
      <InputWrapper key={key} col={3}>
        {key}
        <input onChange={(event) => handleChange(key, event?.target.value)} value={value} type="number" name="" id="" />
      </InputWrapper>
    );
}

interface InputWrapperProps {
  col: number;
  children: React.ReactNode;
}

function InputWrapper({ col, children }: InputWrapperProps) {
  return <div style={{ display: "flex", alignItems: "center", gridColumn: col, width: "max-content", gap: "1rem" }}>{children}</div>;
}

function paramsToObject(entries: IterableIterator<[string, string]>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of entries) {
    result[key] = value;
  }
  return result;
}
