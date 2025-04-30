import React, { createContext } from 'react';

type NavigationContextType = {
  setBlockNavigation: (blocked: boolean) => void;
};

const NavigationContext = createContext<NavigationContextType>({
  setBlockNavigation: () => {},
});

export default NavigationContext; 