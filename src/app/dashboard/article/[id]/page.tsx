"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { FeedArticleViewer } from "@/components/feed-article-viewer";

export default function ArticlePage() {
  const router = useRouter();
  const params = useParams();
  const idParam = params.id as string;
  const articleId = Number(idParam);

  const handleBack = () => {
    router.back();
  };

  return <FeedArticleViewer articleId={articleId} onBack={handleBack} />;
}
