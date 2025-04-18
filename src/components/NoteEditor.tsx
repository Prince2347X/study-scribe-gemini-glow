import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BookText, FilePlus, Save, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateSummary, generateNotes } from "../services/gemini";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Note = {
  id: string;
  title: string;
  content: string;
  subject: string;
  summary?: string;
  createdAt: Date;
};

const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "History",
  "Geography",
  "Literature",
  "Economics",
  "Other",
];

const NoteEditor = () => {
  const [notes, setNotes] = useState<Note[]>(() => {
    const savedNotes = localStorage.getItem("study-notes");
    if (savedNotes) {
      // Parse notes and convert date strings back to Date objects
      const parsedNotes = JSON.parse(savedNotes);
      return parsedNotes.map((note: any) => ({
        ...note,
        createdAt: new Date(note.createdAt),
      }));
    }
    return [];
  });

  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteSubject, setNoteSubject] = useState(SUBJECTS[0]);
  const [summary, setSummary] = useState("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");

  useEffect(() => {
    // Convert Date objects to ISO strings for storage
    const notesToStore = notes.map((note) => ({
      ...note,
      createdAt: note.createdAt.toISOString(),
    }));
    localStorage.setItem("study-notes", JSON.stringify(notesToStore));
  }, [notes]);

  const createNewNote = () => {
    setActiveNote(null);
    setNoteTitle("");
    setNoteContent("");
    setNoteSubject(SUBJECTS[0]);
    setSummary("");
  };

  const saveNote = () => {
    if (noteTitle.trim() === "") {
      toast.error("Note title cannot be empty");
      return;
    }

    if (activeNote) {
      // Update existing note
      const updatedNotes = notes.map((note) =>
        note.id === activeNote.id
          ? {
              ...note,
              title: noteTitle,
              content: noteContent,
              subject: noteSubject,
              summary,
            } // Save summary
          : note,
      );
      setNotes(updatedNotes);
      setActiveNote({
        ...activeNote,
        title: noteTitle,
        content: noteContent,
        subject: noteSubject,
        summary,
      }); // Save summary
      toast.success("Note updated successfully");
    } else {
      // Create new note
      const newNote: Note = {
        id: crypto.randomUUID(),
        title: noteTitle,
        content: noteContent,
        subject: noteSubject,
        summary, // Save summary
        createdAt: new Date(),
      };
      setNotes([...notes, newNote]);
      setActiveNote(newNote);
      toast.success("Note created successfully");
    }
  };

  const deleteNote = (id: string) => {
    setNotes(notes.filter((note) => note.id !== id));
    if (activeNote && activeNote.id === id) {
      createNewNote();
    }
    toast.info("Note deleted");
  };

  const selectNote = (note: Note) => {
    setActiveNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteSubject(note.subject);
    setSummary(note.summary || ""); // Load the saved summary if it exists
  };

  const handleGenerateSummary = async () => {
    if (noteContent.trim().length < 50) {
      toast.error("Please add more content to generate a summary");
      return;
    }

    setIsGeneratingSummary(true);
    setSummary("");

    try {
      const result = await generateSummary(noteContent);
      if (result) {
        setSummary(result);
        // Automatically save the note with the new summary
        if (activeNote) {
          // Update existing note
          const updatedNotes = notes.map((note) =>
            note.id === activeNote.id
              ? {
                  ...note,
                  title: noteTitle,
                  content: noteContent,
                  subject: noteSubject,
                  summary: result,
                }
              : note,
          );
          setNotes(updatedNotes);
          setActiveNote({
            ...activeNote,
            title: noteTitle,
            content: noteContent,
            subject: noteSubject,
            summary: result,
          });
        } else {
          // Create new note
          const newNote: Note = {
            id: crypto.randomUUID(),
            title: noteTitle,
            content: noteContent,
            subject: noteSubject,
            summary: result,
            createdAt: new Date(),
          };
          setNotes([...notes, newNote]);
          setActiveNote(newNote);
        }
        setActiveTab("summary");
        toast.success("Summary generated and saved successfully");
      }
    } catch (error) {
      toast.error("Failed to generate summary");
      console.error(error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleGenerateNote = async () => {
    if (noteTitle.trim() === "") {
      toast.error("Please provide a title for the note");
      return;
    }

    setIsGeneratingNote(true);
    setNoteContent("");

    try {
      const result = await generateNotes(noteSubject, noteTitle);
      if (result) {
        setNoteContent(result);
        toast.success("Notes generated successfully");
      }
    } catch (error) {
      toast.error("Failed to generate notes");
      console.error(error);
    } finally {
      setIsGeneratingNote(false);
    }
  };

  const handlePreviewClick = () => {
    setActiveTab("preview");
  };

  return (
    <Card className="w-full shadow-lg border-2 border-blue-200 bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl font-bold">
          <span className="gradient-text">Smart Notes</span>
        </CardTitle>
        <CardDescription>
          Create and manage your study notes with AI summaries
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-3 h-[500px]">
          {/* Note List Sidebar */}
          <div className="border-r md:col-span-1">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-medium">My Notes</h3>
              <Button
                onClick={createNewNote}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <FilePlus className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="h-[430px]">
              <div className="p-2 space-y-1">
                {notes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No notes yet. Create your first note!
                  </div>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className={`p-2 rounded-md cursor-pointer hover:bg-accent flex justify-between ${
                        activeNote?.id === note.id ? "bg-accent" : ""
                      }`}
                      onClick={() => selectNote(note)}
                    >
                      <div className="overflow-hidden">
                        <div className="font-medium truncate">{note.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {note.subject}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNote(note.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Note Editor */}
          <div className="md:col-span-2 flex flex-col">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex flex-col flex-1"
            >
              <div className="px-4 pt-2 border-b">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="editor">Editor</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="summary">AI Summary</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value="editor"
                className="flex-1 px-4 py-2 overflow-hidden flex flex-col"
              >
                <div className="space-y-2 mb-2 flex flex-col gap-2">
                  <Input
                    placeholder="Note title"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    className="font-medium"
                  />
                  <Select value={noteSubject} onValueChange={setNoteSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isGeneratingNote ? (
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : (
                  <Textarea
                    placeholder="Start writing your notes here... (Markdown supported)"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="flex-1 resize-none min-h-[300px] font-mono"
                  />
                )}

                <div className="flex justify-between mt-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex gap-1"
                      onClick={handleGenerateNote}
                      disabled={noteTitle.trim() === "" || isGeneratingNote}
                    >
                      <Sparkles className="h-4 w-4" />
                      {isGeneratingNote ? "Generating..." : "Generate Note"}
                    </Button>
                  </div>
                  <Button onClick={handlePreviewClick} className="gradient-bg">
                    Preview
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="flex-1 px-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="font-medium text-sm">Title</div>
                    <div className="p-2 border rounded-md bg-muted">
                      {noteTitle}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium text-sm">Subject</div>
                    <div className="p-2 border rounded-md bg-muted">
                      {noteSubject}
                    </div>
                  </div>
                  <ScrollArea className="h-[220px] border rounded-md p-4">
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {noteContent || "_No content to preview_"}
                      </ReactMarkdown>
                    </div>
                  </ScrollArea>
                  <div className="flex justify-between mt-3">
                    <Button
                      variant="outline"
                      className="flex gap-1"
                      onClick={handleGenerateSummary}
                      disabled={
                        noteContent.trim().length < 50 || isGeneratingSummary
                      }
                    >
                      <Sparkles className="h-4 w-4" />
                      {isGeneratingSummary
                        ? "Generating..."
                        : "Generate Summary"}
                    </Button>
                    <Button onClick={saveNote} className="gradient-bg">
                      <Save className="h-4 w-4 mr-1" />
                      Save Note
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="summary"
                className="flex-1 px-4 py-3 space-y-4"
              >
                {isGeneratingSummary ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ) : summary ? (
                  <ScrollArea className="h-[350px]">
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {summary}
                      </ReactMarkdown>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <BookText className="h-12 w-12 mb-2 opacity-30" />
                    <p>No summary generated yet</p>
                    <Button
                      variant="outline"
                      className="mt-4 flex gap-1"
                      onClick={handleGenerateSummary}
                      disabled={
                        noteContent.trim().length < 50 || isGeneratingSummary
                      }
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate AI Summary
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NoteEditor;
