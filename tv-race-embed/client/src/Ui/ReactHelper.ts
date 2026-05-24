import * as React from "react";
import { observer } from "mobx-react-lite";

export const asComponent = <Element extends React.FunctionComponent<any>>(name: string, el: Element) => {
  el.displayName = name;
  const ret = observer(el) as React.FunctionComponent<React.ComponentProps<Element>>;
  ret.displayName = name;
  return ret;
};
