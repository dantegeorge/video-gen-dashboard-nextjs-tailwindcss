"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
const PreviewPage = () => {
  const [historyData, setHistoryData] = useState(null);
  const domain = "http://localhost:8188";
  const [url, setUrl] = useState("");
  const router = useRouter();
  const fetchData = async () => {
    const promptId = localStorage.getItem("promptId");
    if (promptId) {
      axios
        .get(`${domain}/history/${promptId}`)
        .then((response) => {
          const { [promptId]: history } = response.data;

          if (history) {
            // setHistoryData(response.data);
            const filename = history.outputs[109].gifs[0].filename;
            setUrl(
              `http://localhost:8188/view?filename=${filename}&subfolder=Not%20Upscaled`
            );
          }

          // setHistoryData(response.data);
          console.log(response);
        })
        .catch((error) => {
          console.error("Error fetching history:", error);
        });
    }
  };

  useEffect(() => {
    const intervalId = setInterval(fetchData, 5000); // Call fetchData every 5 seconds

    return () => clearInterval(intervalId); // Cleanup function to stop polling on unmount
  }, []);

  useEffect(() => {}, []);
  const handleClearAndRedirect = () => {
    localStorage.clear(); // Clear local storage
    router.push("/"); // Redirect to root path (/)
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        flexDirection: "column",
      }}
    >
      {url ? (
        <video
          controls
          autoPlay
          src={url}
          loop
          style={{ width: "100%", height: "100%" }}
        ></video>
      ) : (
        <div>Loading...</div>
      )}

      <button onClick={handleClearAndRedirect}>New Video</button>
    </div>
  );
};

export default PreviewPage;
