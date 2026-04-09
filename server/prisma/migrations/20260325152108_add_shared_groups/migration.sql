-- AlterTable
ALTER TABLE "FlashcardGroup" ADD COLUMN     "sharedTopic" TEXT;

-- CreateTable
CREATE TABLE "SharedGroup" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedFlashcard" (
    "id" TEXT NOT NULL,
    "english" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "backKind" TEXT NOT NULL DEFAULT 'translation',
    "pronunciation" TEXT,
    "partOfSpeech" TEXT,
    "exampleSentence" TEXT,
    "sharedGroupId" TEXT NOT NULL,

    CONSTRAINT "SharedFlashcard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SharedGroup_topic_level_key" ON "SharedGroup"("topic", "level");

-- AddForeignKey
ALTER TABLE "SharedFlashcard" ADD CONSTRAINT "SharedFlashcard_sharedGroupId_fkey" FOREIGN KEY ("sharedGroupId") REFERENCES "SharedGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
