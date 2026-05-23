"use client";

import { useEffect } from "react";

// iframe 임베드(?embed=1) 시, 콘텐츠 높이가 바뀔 때마다 부모 창으로 높이를 보낸다.
// 부모 페이지는 message 리스너로 iframe 높이를 갱신해 내부 스크롤 없이 매끄럽게 맞춘다.
// 부모 스니펫:
//   <iframe id="seo" src="https://.../geo?embed=1" style="width:100%;border:0" allow="clipboard-write"></iframe>
//   <script>addEventListener('message',e=>{if(e.data?.type==='seo-app:resize')document.getElementById('seo').style.height=e.data.height+'px'})</script>
export default function EmbedResizer() {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("embed") !== "1") return;
    if (window.parent === window) return; // iframe이 아니면 무시

    const post = () => {
      const height = Math.ceil(document.documentElement.scrollHeight);
      window.parent.postMessage({ type: "seo-app:resize", height }, "*");
    };

    post();
    const ro = new ResizeObserver(post);
    ro.observe(document.body);
    window.addEventListener("load", post);
    return () => {
      ro.disconnect();
      window.removeEventListener("load", post);
    };
  }, []);

  return null;
}
