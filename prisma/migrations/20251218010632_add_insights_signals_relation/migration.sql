-- CreateTable
CREATE TABLE "_InsightToSignal" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_InsightToSignal_A_fkey" FOREIGN KEY ("A") REFERENCES "Insight" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_InsightToSignal_B_fkey" FOREIGN KEY ("B") REFERENCES "Signal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_InsightToSignal_AB_unique" ON "_InsightToSignal"("A", "B");

-- CreateIndex
CREATE INDEX "_InsightToSignal_B_index" ON "_InsightToSignal"("B");
