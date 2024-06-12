"use client";
import React, { useEffect } from "react";

const MapOne: React.FC = () => {
  return (
    <div className="col-span-12 rounded-sm border border-stroke bg-white px-7.5 py-6 shadow-default dark:border-strokedark dark:bg-boxdark xl:col-span-7">
      <h4 className="mb-2 text-xl font-semibold text-black dark:text-white">
        Select Workflow:
      </h4>
      <form>
        <div className="mb-5.5">
          <select
            className="w-full rounded border border-stroke bg-gray px-4.5 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white dark:focus:border-primary"
            name="Username"
            id="Username"
            defaultValue="devidjhon24"
          />
        </div>
      </form>
    </div>
  );
};

export default MapOne;
