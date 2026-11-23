import "@/components/reader.css";
import { sectionRoute } from "../../section-route";

const route = sectionRoute("blog");
export default route.Page;
export const generateMetadata = route.generateMetadata;
