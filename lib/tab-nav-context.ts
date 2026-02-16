import { createContext, useContext } from "react";

type TabNavContextType = {
  goToTab: (index: number) => void;
};

export const TabNavContext = createContext<TabNavContextType>({
  goToTab: () => {},
});

export function useTabNav() {
  return useContext(TabNavContext);
}
