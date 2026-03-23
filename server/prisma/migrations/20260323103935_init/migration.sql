-- CreateTable
CREATE TABLE "FlashcardGroup" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "groupStatus" TEXT NOT NULL DEFAULT 'in_progress',
    "mode" TEXT NOT NULL DEFAULT 'translation',
    "frontLang" TEXT NOT NULL DEFAULT 'English',
    "backLang" TEXT NOT NULL DEFAULT 'Ukrainian',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlashcardGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flashcard" (
    "id" TEXT NOT NULL,
    "english" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "backKind" TEXT NOT NULL DEFAULT 'translation',
    "status" TEXT NOT NULL DEFAULT 'new',
    "pronunciation" TEXT,
    "partOfSpeech" TEXT,
    "exampleSentence" TEXT,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "Flashcard_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FlashcardGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
