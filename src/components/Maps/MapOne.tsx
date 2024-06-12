"use client";
import React, { useEffect } from "react";
import MultiSelect from "../FormElements/MultiSelect";

const MapOne: React.FC = () => {
  return (
    <div className="col-span-12 rounded-sm border border-stroke bg-white px-7.5 py-6 shadow-default dark:border-strokedark dark:bg-boxdark xl:col-span-7">
      <h4 className="mb-2 text-xl font-semibold text-black dark:text-white">
        Select Workflow:
      </h4>
      <MultiSelect id="1" />
    </div>
  );
};

export default MapOne;
