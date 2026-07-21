"use client";

import { useEffect, useState } from "react";
import {
  addVocabularyItems,
  isWordSaved,
  updateVocabularyItem,
} from "@/lib/vocabularyStorage";

type Props = {
  word: string;
  meaning: string;
};

export default function AddToVocabularyButton({
  word,
  meaning,
}: Props) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(Boolean(isWordSaved(word)));
  }, [word]);

  function addToVocabulary() {
    if (isWordSaved(word)) {
      setSaved(true);
      return;
    }

    addVocabularyItems(
      [
        {
          word,
          count: 1,
          firstPage: 1,
        },
      ],
      "BookRoot Dictionary",
    );

    const savedItem = isWordSaved(word);

    if (savedItem) {
      updateVocabularyItem(savedItem.id, {
        meaning,
      });
    }

    setSaved(true);
  }

  return (
    <button
      type="button"
      onClick={addToVocabulary}
      disabled={saved}
      className={`w-full rounded-xl px-4 py-3 font-semibold ${
        saved
          ? "cursor-default bg-green-50 text-green-700"
          : "bg-green-700 text-white hover:bg-green-800"
      }`}
    >
      {saved
        ? "✓ Added to My Vocabulary"
        : "+ Add to My Vocabulary"}
    </button>
  );
}