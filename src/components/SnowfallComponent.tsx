import React from "react";
import Snowfall from "react-snowfall";

/**
 * Returns a snowfall animation component.
 *
 * @returns {JSX.Element} A snowfall animation component.
 */
const SnowfallComponent = () => {
  return (
    <>
      <Snowfall
        style={{
          position: "fixed",
          width: "100vw",
          height: "100vh",
          zIndex: 100,
        }}
      />
    </>
  );
};

export default SnowfallComponent;
