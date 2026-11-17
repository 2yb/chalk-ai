"use client";

import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  GraduationCap,
  Headphones,
  LoaderCircle,
  MessageCircle,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Send,
  Sparkles,
  Sun,
  ThumbsDown,
  ThumbsUp,
  Volume2,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import Link from "next/link";

import Whiteboard from "@/components/whiteboard";
import { DEMO_LESSONS, type DemoLessonCard } from "@/data/demo-lessons";
import { scheduleActions } from "@/lib/lesson-timeline";
import type { Lesson } from "@/schemas/lesson.schema";

type LessonSource = "generated" | "cached" | "demo" | "fallback";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type FeedbackRating = "helpful" | "not-helpful";

const lessonLoadingStages = [
  "Finding a clear way to explain the topic",
  "Planning the whiteboard sketches",
  "Putting the narration together",
];

const lessonSourceLabels: Record<LessonSource, string> = {
  generated: "AI generated",
  cached: "Cache hit · instant",
  demo: "Preloaded demo",
  fallback: "Offline demo fallback",
};

const topicSuggestions = [
  "How do black holes work?",
  "The water cycle",
  "Why do airplanes fly?",
];

function getWordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getEstimatedDuration(lesson: Lesson) {
  const wordCount = lesson.segments.reduce(
    (total, segment) => total + getWordCount(segment.narration),
    0,
  );
  return Math.max(30, Math.round(wordCount / 2.35));
}

function getOffsetAtWordProgress(text: string, progress: number) {
  const words = [...text.matchAll(/\S+/g)];
  if (words.length === 0) return 0;
  if (progress >= 1) return text.length;
  const targetIndex = Math.floor(words.length * Math.max(0, progress));
  return words[targetIndex]?.index ?? 0;
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function getLessonSource(source: unknown): LessonSource {
  if (source === "cached" || source === "demo" || source === "fallback") {
    return source;
  }
  return "generated";
}

export default function TutorStudio() {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [sendingQuestion, setSendingQuestion] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [lessonSource, setLessonSource] = useState<LessonSource>("generated");
  const [responseFeedback, setResponseFeedback] = useState<
    Record<number, FeedbackRating>
  >({});
  const [teachingFeedback, setTeachingFeedback] =
    useState<FeedbackRating | null>(null);
  const [audioError, setAudioError] = useState("");
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "outline">("chat");

  const messageEndRef = useRef<HTMLDivElement>(null);
  const speechTokenRef = useRef(0);
  const speechActiveRef = useRef(false);
  const isPlayingRef = useRef(false);
  const activeSegmentEndRef = useRef(0);

  const duration = lesson ? getEstimatedDuration(lesson) : 0;
  const scheduledActions = useMemo(
    () => (lesson ? scheduleActions(lesson, duration || lesson.estimatedDurationSeconds) : []),
    [lesson, duration],
  );
  const visibleActions = useMemo(
    () =>
      scheduledActions
        .filter((scheduled) => scheduled.atSeconds <= currentTime + 0.15)
        .map((scheduled) => scheduled.action),
    [currentTime, scheduledActions],
  );

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying || !lesson) return;

    let previousTick = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const elapsed = (now - previousTick) / 1000;
      previousTick = now;
      setCurrentTime((current) =>
        Math.min(duration, activeSegmentEndRef.current, current + elapsed),
      );
    }, 100);

    return () => window.clearInterval(interval);
  }, [duration, isPlaying, lesson]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("chalkai-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (!loadingLesson) return;

    const interval = window.setInterval(() => {
      setLoadingStage((stage) => (stage + 1) % lessonLoadingStages.length);
    }, 2200);
    return () => window.clearInterval(interval);
  }, [loadingLesson]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loadingLesson, sendingQuestion]);

  useEffect(() => {
    return () => {
      speechTokenRef.current += 1;
      window.speechSynthesis?.cancel();
    };
  }, []);

  function resetPlayback() {
    speechTokenRef.current += 1;
    speechActiveRef.current = false;
    isPlayingRef.current = false;
    window.speechSynthesis?.cancel();
    setCurrentTime(0);
    setIsPlaying(false);
    setAudioError("");
  }

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    window.localStorage.setItem("chalkai-theme", nextTheme);
  }

  function rateResponse(index: number, rating: FeedbackRating) {
    setResponseFeedback((current) => ({ ...current, [index]: rating }));
  }

  function openDemoLesson(demo: DemoLessonCard) {
    resetPlayback();
    setLoadingLesson(false);
    setLesson(demo.lesson);
    setLessonSource("demo");
    setTopic(demo.lesson.topic);
    setDifficulty("beginner");
    setError("");
    setResponseFeedback({});
    setTeachingFeedback(null);
    setMessages([
      { role: "user", content: `Show me the demo: ${demo.title}` },
      {
        role: "assistant",
        content: `This preloaded lesson is ready to play without an AI request.\n\n${demo.lesson.introduction}`,
      },
    ]);
    setActiveTab("chat");
  }

  async function generateLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestedTopic = topic.trim();
    if (requestedTopic.length < 3 || loadingLesson) return;

    resetPlayback();
    setLoadingStage(0);
    setLoadingLesson(true);
    setLessonSource("generated");
    setError("");
    setResponseFeedback({});
    setTeachingFeedback(null);
    setMessages([{ role: "user", content: requestedTopic }]);
    setLesson(null);
    setActiveTab("chat");

    try {
      const response = await fetch("/api/generate-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: requestedTopic, difficulty }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not generate the lesson.");
      }

      const generatedLesson = result.data as Lesson;
      const source = getLessonSource(result.source);
      setLesson(generatedLesson);
      setLessonSource(source);
      const sourceNotice =
        source === "fallback"
          ? `AI generation is unavailable. Showing the related ${generatedLesson.topic} demo lesson instead.`
          : source === "cached"
            ? "Loaded instantly from the lesson cache; no new AI request was needed."
            : "";
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: [
            sourceNotice,
            generatedLesson.introduction,
            `We’ll cover ${generatedLesson.learningObjectives.slice(0, 2).join(" and ").toLowerCase()}. Press play when you’re ready.`,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong while generating the lesson.");
      setMessages([]);
    } finally {
      setLoadingLesson(false);
    }
  }

  async function askFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!lesson || question.length === 0 || sendingQuestion) return;

    const nextMessages = [...messages, { role: "user" as const, content: question }];
    // The topic and lesson introduction are sent separately as structured context.
    const conversationHistory = nextMessages
      .slice(2)
      .slice(-12)
      .map(({ role, content }) => ({ role, content: content.slice(0, 1000) }));
    setMessages(nextMessages);
    setDraft("");
    setSendingQuestion(true);
    setError("");

    try {
      const response = await fetch("/api/follow-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: lesson.topic,
          lesson: {
            title: lesson.title,
            introduction: lesson.introduction,
            segments: lesson.segments.map(({ heading, narration }) => ({ heading, narration })),
          },
          messages: conversationHistory,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Could not get an answer.");
      }
      setMessages((current) => [...current, { role: "assistant", content: result.data.answer }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong while answering.");
    } finally {
      setSendingQuestion(false);
    }
  }

  function speakFrom(seconds: number) {
    if (!lesson || !("speechSynthesis" in window)) {
      setAudioError("Audio playback is not available in this browser.");
      setIsPlaying(false);
      return;
    }

    const playbackDuration = duration || getEstimatedDuration(lesson);
    const segments = lesson.segments;
    const wordCounts = segments.map((segment) => Math.max(1, getWordCount(segment.narration)));
    const totalWords = wordCounts.reduce((total, count) => total + count, 0);
    const token = ++speechTokenRef.current;
    let start = 0;
    let startIndex = segments.length - 1;
    let startOffset = 0;

    window.speechSynthesis?.cancel();
    speechActiveRef.current = true;

    for (let index = 0; index < segments.length; index += 1) {
      const segmentDuration = playbackDuration * (wordCounts[index] / totalWords);
      if (seconds < start + segmentDuration || index === segments.length - 1) {
        startIndex = index;
        const fraction = Math.max(0, Math.min(1, (seconds - start) / segmentDuration));
        startOffset = getOffsetAtWordProgress(segments[index].narration, fraction);
        break;
      }
      start += segmentDuration;
    }

    const speakSegment = (index: number, offset: number, segmentStart: number) => {
      if (speechTokenRef.current !== token || !isPlayingRef.current) return;
      const segment = segments[index];
      const segmentDuration = playbackDuration * (wordCounts[index] / totalWords);
      const segmentEnd = Math.min(playbackDuration, segmentStart + segmentDuration);
      activeSegmentEndRef.current = segmentEnd;
      const phrase = segment.narration.slice(offset);
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.rate = 1;
      utterance.onboundary = (boundary) => {
        if (speechTokenRef.current !== token) return;
        const position = Math.min(segment.narration.length, offset + boundary.charIndex);
        const wordsSpoken = getWordCount(segment.narration.slice(0, position));
        const progress = Math.min(1, wordsSpoken / wordCounts[index]);
        const boundaryTime = Math.min(segmentEnd, segmentStart + segmentDuration * progress);
        setCurrentTime((current) => Math.max(current, boundaryTime));
      };
      utterance.onend = () => {
        if (speechTokenRef.current !== token) return;
        setCurrentTime((current) => Math.max(current, segmentEnd));
        if (index + 1 < segments.length) {
          if (isPlayingRef.current) {
            speakSegment(index + 1, 0, segmentEnd);
          } else {
            speechActiveRef.current = false;
          }
          return;
        }

        speechActiveRef.current = false;
        isPlayingRef.current = false;
        setCurrentTime(playbackDuration);
        setIsPlaying(false);
      };
      utterance.onerror = () => {
        if (speechTokenRef.current !== token) return;
        speechActiveRef.current = false;
        isPlayingRef.current = false;
        setIsPlaying(false);
        setAudioError("Your browser could not play the voice narration.");
      };
      window.speechSynthesis.speak(utterance);
    };

    const precedingDuration = wordCounts
      .slice(0, startIndex)
      .reduce((total, count) => total + playbackDuration * (count / totalWords), 0);
    setCurrentTime(seconds);
    isPlayingRef.current = true;
    setIsPlaying(true);
    speakSegment(startIndex, startOffset, precedingDuration);
  }

  function togglePlayback() {
    if (!lesson) return;
    setAudioError("");

    if (speechActiveRef.current && isPlaying) {
      window.speechSynthesis.pause();
      isPlayingRef.current = false;
      setIsPlaying(false);
      return;
    }
    if (speechActiveRef.current && !isPlaying) {
      if (currentTime >= duration) {
        speakFrom(0);
      } else {
        window.speechSynthesis.resume();
        isPlayingRef.current = true;
        setIsPlaying(true);
      }
      return;
    }

    speakFrom(currentTime >= duration ? 0 : currentTime);
  }

  function restartPlayback() {
    setAudioError("");
    speechTokenRef.current += 1;
    window.speechSynthesis?.cancel();
    speechActiveRef.current = false;
    setCurrentTime(0);
    if (isPlaying) speakFrom(0);
    else setIsPlaying(false);
  }

  function seekPlayback(value: number) {
    const targetTime = Math.max(0, Math.min(value, duration));
    setCurrentTime(targetTime);

    if (targetTime >= duration) {
      speechTokenRef.current += 1;
      window.speechSynthesis?.cancel();
      speechActiveRef.current = false;
      isPlayingRef.current = false;
      setIsPlaying(false);
      return;
    }

    if (speechActiveRef.current) {
      speechTokenRef.current += 1;
      window.speechSynthesis?.cancel();
      speechActiveRef.current = false;
      if (isPlaying) speakFrom(targetTime);
    }
  }

  return (
    <main className="studio-shell" data-theme={theme}>
      <header className="studio-header">
        <Link href="/" className="brand-lockup" aria-label="ChalkAI home">
          <span className="brand-icon"><GraduationCap size={23} strokeWidth={2.2} /></span>
          <span>
            <span className="brand-name">ChalkAI</span>
            <span className="brand-subtitle">Your personal AI tutor</span>
          </span>
        </Link>
        <div className="header-right">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
          >
            {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
            <span>{theme === "light" ? "Dark" : "Light"}</span>
          </button>
          <span className="availability-dot" />
          <span className="header-status">AI tutor ready</span>
          <button className="header-help" type="button" aria-label="About ChalkAI" title="Learn anything through a narrated visual lesson">
            <CircleHelp size={18} />
          </button>
        </div>
      </header>

      <div className="studio-content">
        <div className="studio-intro">
          <div>
            <div className="intro-kicker"><Sparkles size={14} /> YOUR VISUAL LEARNING STUDIO</div>
            <h1>Big ideas, made <span>clear.</span></h1>
          </div>
          <p>Ask a question. Watch the idea unfold.</p>
        </div>

        <div className="studio-grid">
          <aside className="chat-panel">
            <div className="panel-heading">
              <div className="panel-heading-icon"><MessageCircle size={17} /></div>
              <div>
                <h2>Your tutor</h2>
                <p>Ask anything. Get a visual answer.</p>
              </div>
              <button
                type="button"
                className="panel-menu"
                onClick={() => {
                  resetPlayback();
                  setLesson(null);
                  setMessages([]);
                  setError("");
                  setTopic("");
                  setLessonSource("generated");
                  setResponseFeedback({});
                  setTeachingFeedback(null);
                }}
                aria-label="Start a new lesson"
                title="New lesson"
              >
                <Sparkles size={16} />
              </button>
            </div>

            <div className="chat-tabs" role="tablist" aria-label="Tutor panel">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "chat"}
                className={activeTab === "chat" ? "chat-tab chat-tab-active" : "chat-tab"}
                onClick={() => setActiveTab("chat")}
              >
                <MessageCircle size={14} /> Chat
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "outline"}
                className={activeTab === "outline" ? "chat-tab chat-tab-active" : "chat-tab"}
                onClick={() => setActiveTab("outline")}
              >
                <BookOpen size={14} /> Lesson
                {lesson && <span className="tab-count">{lesson.segments.length}</span>}
              </button>
            </div>

            {activeTab === "outline" && lesson ? (
              <div className="outline-scroll">
                <div className="outline-summary">
                  <span className="outline-duration"><Headphones size={13} /> {Math.round(lesson.estimatedDurationSeconds / 60)} min lesson</span>
                  <h3>{lesson.title}</h3>
                  <p>{lesson.introduction}</p>
                </div>
                <div className="outline-objectives">
                  <p className="outline-label">YOU’LL LEARN</p>
                  {lesson.learningObjectives.map((objective) => (
                    <p className="objective-item" key={objective}><Check size={14} /> {objective}</p>
                  ))}
                </div>
                <div className="outline-segments">
                  {lesson.segments.map((segment, index) => (
                    <button
                      type="button"
                      key={segment.id}
                      className="outline-segment"
                      onClick={() => {
                        const wordsBefore = lesson.segments
                          .slice(0, index)
                          .reduce((total, item) => total + getWordCount(item.narration), 0);
                        const totalWords = lesson.segments.reduce(
                          (total, item) => total + getWordCount(item.narration),
                          0,
                        );
                        seekPlayback(duration * (wordsBefore / Math.max(1, totalWords)));
                      }}
                    >
                      <span className="segment-index">{String(index + 1).padStart(2, "0")}</span>
                      <span>{segment.heading}</span>
                      <ChevronDown size={14} className="segment-chevron" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="chat-scroll">
                {messages.length === 0 && !loadingLesson && (
                  <div className="welcome-message">
                    <div className="tutor-avatar"><GraduationCap size={18} /></div>
                    <div className="welcome-copy">
                      <p className="welcome-title">Hey there! What are you curious about?</p>
                      <p>I’ll make you a short lesson with a voice guide and drawings that appear as we go.</p>
                    </div>
                    <div className="suggestion-list">
                      {topicSuggestions.map((suggestion) => (
                        <button key={suggestion} type="button" onClick={() => setTopic(suggestion)}>
                          {suggestion}<ArrowUp size={13} />
                        </button>
                      ))}
                    </div>
                    <div className="demo-lessons">
                      <div className="demo-lessons-heading">
                        <span>PRELOADED LESSONS</span>
                        <span>Ready instantly</span>
                      </div>
                      <p className="demo-cache-note">
                        AI lessons are cached for 10 minutes — repeat a topic to see a cache hit.
                      </p>
                      {DEMO_LESSONS.map((demo) => (
                        <button
                          key={demo.id}
                          type="button"
                          className="demo-lesson-card"
                          onClick={() => openDemoLesson(demo)}
                          aria-label={`Play demo lesson: ${demo.title}`}
                        >
                          <span className="demo-lesson-icon"><BookOpen size={15} /></span>
                          <span className="demo-lesson-copy">
                            <strong>{demo.title}</strong>
                            <span>{demo.description}</span>
                          </span>
                          <span className="demo-lesson-duration">2 min</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((message, index) => (
                  <div className={`message-row message-${message.role}`} key={`${message.role}-${index}`}>
                    {message.role === "assistant" && (
                      <div className="tutor-avatar tutor-avatar-small"><GraduationCap size={15} /></div>
                    )}
                    <div className="message-content">
                      <div className="message-bubble">
                        {message.content.split("\n").map((paragraph, paragraphIndex) => (
                          <p key={`${index}-${paragraphIndex}`}>{paragraph}</p>
                        ))}
                      </div>
                      {message.role === "assistant" && (
                        <div className="message-feedback" role="group" aria-label="Rate this tutor response">
                          <span role="status">
                            {responseFeedback[index] ? "Thanks for the feedback" : "Helpful?"}
                          </span>
                          <button
                            type="button"
                            className={responseFeedback[index] === "helpful" ? "feedback-button feedback-selected" : "feedback-button"}
                            onClick={() => rateResponse(index, "helpful")}
                            aria-label="This response was helpful"
                            aria-pressed={responseFeedback[index] === "helpful"}
                            title="Helpful"
                          >
                            <ThumbsUp size={13} />
                          </button>
                          <button
                            type="button"
                            className={responseFeedback[index] === "not-helpful" ? "feedback-button feedback-selected" : "feedback-button"}
                            onClick={() => rateResponse(index, "not-helpful")}
                            aria-label="This response was not helpful"
                            aria-pressed={responseFeedback[index] === "not-helpful"}
                            title="Not helpful"
                          >
                            <ThumbsDown size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {loadingLesson && (
                  <div className="message-row message-assistant" role="status" aria-live="polite">
                    <div className="tutor-avatar tutor-avatar-small tutor-avatar-thinking">
                      <GraduationCap size={15} />
                    </div>
                    <div className="lesson-loading-card">
                      <div className="loading-card-heading">
                        <span>Your tutor is preparing a lesson</span>
                        <span className="thinking-dots" aria-hidden="true">
                          <i />
                          <i />
                          <i />
                        </span>
                      </div>
                      <p>{lessonLoadingStages[loadingStage]}</p>
                      <div className="loading-progress-track" aria-hidden="true">
                        <span />
                      </div>
                    </div>
                  </div>
                )}
                {sendingQuestion && (
                  <div className="message-row message-assistant">
                    <div className="tutor-avatar tutor-avatar-small"><GraduationCap size={15} /></div>
                    <div className="message-bubble loading-bubble"><LoaderCircle size={15} className="spin" /> Thinking it through…</div>
                  </div>
                )}
                <div ref={messageEndRef} />
              </div>
            )}

            {error && <div className="inline-error" role="alert">{error}</div>}

            <form
              className="composer"
              onSubmit={lesson ? askFollowUp : generateLesson}
            >
              {lesson ? (
                <>
                  <label className="sr-only" htmlFor="follow-up">Ask a follow-up question</label>
                  <textarea
                    id="follow-up"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Ask a follow-up…"
                    maxLength={1000}
                    rows={1}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  <button
                    type="submit"
                    className="send-button"
                    disabled={sendingQuestion || !draft.trim()}
                    aria-label="Send follow-up question"
                  >
                    {sendingQuestion ? <LoaderCircle size={17} className="spin" /> : <Send size={16} />}
                  </button>
                </>
              ) : (
                <>
                  <label className="sr-only" htmlFor="topic">What would you like to learn?</label>
                  <textarea
                    id="topic"
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="What would you like to learn?"
                    maxLength={200}
                    rows={1}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  <label className="sr-only" htmlFor="difficulty">Lesson level</label>
                  <select
                    id="difficulty"
                    value={difficulty}
                    onChange={(event) => setDifficulty(event.target.value as typeof difficulty)}
                    className="difficulty-select"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                  <button
                    type="submit"
                    className="send-button"
                    disabled={loadingLesson || topic.trim().length < 3}
                    aria-label="Create lesson"
                  >
                    {loadingLesson ? <LoaderCircle size={17} className="spin" /> : <ArrowUp size={19} />}
                  </button>
                </>
              )}
            </form>
            <div className="composer-caption">
              {lesson ? "Ask a question about this lesson" : "A 2-minute lesson, tailored to you"}
            </div>
          </aside>

          <section className="lesson-panel">
            <Whiteboard
              actions={visibleActions}
              title={lesson?.title ?? ""}
              loading={loadingLesson}
            />
            <div className="player-card">
              <div className="player-top">
                <div className="player-label">
                  <span className={`audio-icon ${isPlaying ? "audio-icon-playing" : ""}`}><Volume2 size={16} /></span>
                  <div>
                    <p className="player-eyebrow">VOICE NARRATION</p>
                    <p className="player-title">{lesson ? lesson.title : "Your lesson audio"}</p>
                  </div>
                </div>
                <div className="player-metadata">
                  {lesson && (
                    <span className={`lesson-source-badge lesson-source-${lessonSource}`}>
                      {lessonSourceLabels[lessonSource]}
                    </span>
                  )}
                  <span className="audio-quality"><span /> BROWSER VOICE</span>
                </div>
              </div>
              <div className="timeline-row">
                <span className="time-label">{formatTime(currentTime)}</span>
                <input
                  aria-label="Seek through lesson"
                  type="range"
                  min={0}
                  max={Math.max(1, duration)}
                  step={0.1}
                  value={Math.min(currentTime, duration || 0)}
                  onChange={(event) => seekPlayback(Number(event.target.value))}
                  className="timeline-slider"
                  style={{ "--progress": `${duration ? (currentTime / duration) * 100 : 0}%` } as CSSProperties}
                  disabled={!lesson}
                />
                <span className="time-label">{formatTime(duration)}</span>
              </div>
              <div className="player-controls">
                <div className="controls-left">
                  <button
                    type="button"
                    className="control-icon"
                    onClick={restartPlayback}
                    disabled={!lesson}
                    aria-label="Restart lesson"
                    title="Restart lesson"
                  >
                    <RotateCcw size={17} />
                  </button>
                  <span className="control-divider" />
                  <span className="play-hint">
                    {isPlaying ? "Lesson in progress" : lesson ? "Ready when you are" : "Generate a lesson to begin"}
                  </span>
                </div>
                <button
                  type="button"
                  className="play-button"
                  onClick={togglePlayback}
                  disabled={!lesson}
                  aria-label={isPlaying ? "Pause lesson" : "Play lesson"}
                >
                  {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                  {isPlaying ? "Pause" : currentTime > 0 ? "Resume" : "Play lesson"}
                </button>
              </div>
              {audioError && <p className="audio-note" role="status">{audioError}</p>}
            </div>
            <div className="lesson-hint">
              <div className="hint-icon"><Sparkles size={15} /></div>
              <p>
                {lesson
                  ? "Follow along — each sketch appears as your tutor explains it."
                  : "Your tutor will sketch each idea as they explain it. You can draw on the board, too."}
              </p>
              {lesson && (
                <button type="button" className="hint-outline" onClick={() => setActiveTab("outline")}>
                  Lesson outline <ArrowDown size={13} />
                </button>
              )}
            </div>
            {lesson && (
              <div className="learning-objectives">
                <div className="objectives-heading"><Check size={14} /> TODAY’S TAKEAWAYS</div>
                <div className="takeaway-list">
                  {lesson.learningObjectives.slice(0, 3).map((objective) => (
                    <span key={objective}>{objective}</span>
                  ))}
                </div>
              </div>
            )}
            {lesson && (
              <section className="teaching-feedback" aria-label="Lesson feedback">
                <div className="teaching-feedback-copy">
                  <p className="teaching-feedback-title">How was this lesson?</p>
                  <p>
                    {teachingFeedback
                      ? "Thanks for sharing your rating."
                      : "Did the explanation and sketches help you learn?"}
                  </p>
                </div>
                <div className="teaching-feedback-actions" role="group" aria-label="Rate this lesson">
                  <button
                    type="button"
                    className={teachingFeedback === "helpful" ? "feedback-button feedback-selected" : "feedback-button"}
                    onClick={() => setTeachingFeedback("helpful")}
                    aria-label="This lesson was helpful"
                    aria-pressed={teachingFeedback === "helpful"}
                    title="Helpful"
                  >
                    <ThumbsUp size={15} />
                  </button>
                  <button
                    type="button"
                    className={teachingFeedback === "not-helpful" ? "feedback-button feedback-selected" : "feedback-button"}
                    onClick={() => setTeachingFeedback("not-helpful")}
                    aria-label="This lesson was not helpful"
                    aria-pressed={teachingFeedback === "not-helpful"}
                    title="Not helpful"
                  >
                    <ThumbsDown size={15} />
                  </button>
                </div>
              </section>
            )}
          </section>
        </div>

        <footer className="studio-footer">
          <span>Made for curious minds</span>
          <span>Learn at your own pace <span className="footer-separator">·</span> Ask anything</span>
        </footer>
      </div>
    </main>
  );
}
