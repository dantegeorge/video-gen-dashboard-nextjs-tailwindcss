import WebCam from "@/components/WebCam";
import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLayout";

export const metadata: Metadata = {
  title: "Video Booth | WeSmile",
};

const CalendarPage = () => {
  return <WebCam />;
};

export default CalendarPage;
