'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen,
  Download,
  Smartphone,
  Globe,
  Mic,
  FileText,
  Archive,
  Database,
  FileJson,
  Table,
  ChevronRight,
  HelpCircle,
  Upload,
  Search,
  Brain,
  Eye,
  Trash2,
  LayoutList,
} from 'lucide-react'

export default function Instructions() {
  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto pb-24">
      <div className="flex items-center gap-3">
        <HelpCircle className="h-7 w-7 text-primary" />
        <h2 className="text-2xl font-bold text-primary">Instructions</h2>
      </div>

      <p className="text-sm text-muted-foreground">
        Complete guide to using OSINT Timeline Reconstruction. Tap any section to expand.
      </p>

      <Accordion type="multiple" defaultValue={['getting-started']} className="space-y-2">

        {/* Getting Started */}
        <AccordionItem value="getting-started" className="border border-primary/10 rounded-lg px-1">
          <AccordionTrigger className="text-base font-semibold hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Getting Started
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <Card className="bg-muted/20 border-border/30">
              <CardContent className="pt-4 space-y-3">
                <h4 className="font-semibold text-primary">What This App Does</h4>
                <p className="text-sm text-muted-foreground">
                  OSINT Timeline Reconstruction helps you build a chronological timeline from your digital data exports.
                  Upload Google Takeout, Facebook data, images, audio files, and more — the app automatically extracts
                  timestamped events and presents them in a unified timeline.
                </p>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold">1</span>
                Create Your First Case
              </h4>
              <ol className="text-sm text-muted-foreground space-y-2 ml-8">
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  Go to the <strong className="text-foreground">📁 Cases</strong> tab
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  Tap <strong className="text-foreground">+ New Case</strong>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  Enter a name (e.g., &quot;My Digital Footprint 2024&quot;)
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  Tap <strong className="text-foreground">Create Case</strong>
                </li>
              </ol>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold">2</span>
                Upload Files
              </h4>
              <ol className="text-sm text-muted-foreground space-y-2 ml-8">
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  Go to the <strong className="text-foreground">📤 Upload</strong> tab
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  Tap the upload zone or drag files into it
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  The app auto-detects file type and processes it
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  Extracted events appear in the Timeline
                </li>
              </ol>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold">3</span>
                View Your Timeline
              </h4>
              <ol className="text-sm text-muted-foreground space-y-2 ml-8">
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  Go to the <strong className="text-foreground">📅 Timeline</strong> tab
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  Browse events chronologically
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  Filter by source type or date range
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  Search for specific events
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  Tap an event to see full details
                </li>
              </ol>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* How to Export Your Data */}
        <AccordionItem value="takeout-guides" className="border border-primary/10 rounded-lg px-1">
          <AccordionTrigger className="text-base font-semibold hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              How to Export Your Data (Takeout Guides)
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            {/* Google Takeout */}
            <Card className="bg-muted/20 border-border/30">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-green-400" />
                  <h4 className="font-semibold">Google Takeout</h4>
                </div>
                <ol className="text-sm text-muted-foreground space-y-2 ml-7">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">1.</span>
                    Go to <strong className="text-foreground">takeout.google.com</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">2.</span>
                    Sign in with your Google account
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">3.</span>
                    <strong className="text-foreground">Select data to include:</strong> Check these:
                    <ul className="mt-1 ml-4 space-y-1">
                      <li>✅ My Activity (searches, YouTube, etc.)</li>
                      <li>✅ Location History</li>
                      <li>✅ Chrome (browser history)</li>
                      <li>✅ Google Photos (metadata)</li>
                      <li>✅ Gmail (metadata/headers)</li>
                      <li>✅ YouTube (watch history)</li>
                      <li>✅ Calendar</li>
                    </ul>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">4.</span>
                    Click <strong className="text-foreground">Next step</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">5.</span>
                    Choose delivery method: <strong className="text-foreground">Send download link via email</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">6.</span>
                    Format: <strong className="text-foreground">ZIP</strong>, size: up to 50GB
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">7.</span>
                    Click <strong className="text-foreground">Create export</strong>
                  </li>
                </ol>
                <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-400">
                    ⏱ Export can take from minutes to days depending on data size. Google will email you when ready.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Facebook */}
            <Card className="bg-muted/20 border-border/30">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-400" />
                  <h4 className="font-semibold">Facebook</h4>
                </div>
                <ol className="text-sm text-muted-foreground space-y-2 ml-7">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">1.</span>
                    Go to <strong className="text-foreground">Settings & Privacy → Settings</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">2.</span>
                    Click <strong className="text-foreground">Your Information → Download Your Information</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">3.</span>
                    Select: <strong className="text-foreground">All data</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">4.</span>
                    Format: <strong className="text-foreground">JSON</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">5.</span>
                    Date range: <strong className="text-foreground">All time</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">6.</span>
                    Media quality: <strong className="text-foreground">Low</strong> (smaller download)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">7.</span>
                    Click <strong className="text-foreground">Request a download</strong>
                  </li>
                </ol>
                <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-400">
                    ⏱ Facebook typically takes 10 minutes to a few hours to prepare your download.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Twitter/X */}
            <Card className="bg-muted/20 border-border/30">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-sky-400" />
                  <h4 className="font-semibold">Twitter / X</h4>
                </div>
                <ol className="text-sm text-muted-foreground space-y-2 ml-7">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">1.</span>
                    Go to <strong className="text-foreground">Settings → Your account → Download an archive of your data</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">2.</span>
                    Confirm your identity (password + 2FA)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">3.</span>
                    Click <strong className="text-foreground">Request archive</strong>
                  </li>
                </ol>
                <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-400">
                    ⏱ Twitter archive can take 24-48 hours. You&apos;ll get a push notification and email when ready.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp */}
            <Card className="bg-muted/20 border-border/30">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-green-400" />
                  <h4 className="font-semibold">WhatsApp</h4>
                </div>
                <ol className="text-sm text-muted-foreground space-y-2 ml-7">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">1.</span>
                    Open the chat you want to export
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">2.</span>
                    Tap the contact/group name at the top
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">3.</span>
                    Tap <strong className="text-foreground">⋮ (three dots) → More → Export chat</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">4.</span>
                    Choose <strong className="text-foreground">Without media</strong> (or with media)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">5.</span>
                    Save the exported .txt file and upload it here
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* Telegram */}
            <Card className="bg-muted/20 border-border/30">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-blue-400" />
                  <h4 className="font-semibold">Telegram</h4>
                </div>
                <ol className="text-sm text-muted-foreground space-y-2 ml-7">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">1.</span>
                    Open the chat you want to export (desktop app required)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">2.</span>
                    Click <strong className="text-foreground">⋮ (three dots) → Export chat history</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">3.</span>
                    Select what to include (messages, photos, etc.)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">4.</span>
                    Format: <strong className="text-foreground">JSON or HTML</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">5.</span>
                    Click <strong className="text-foreground">Export</strong>
                  </li>
                </ol>
              </CardContent>
            </Card>

            {/* Instagram */}
            <Card className="bg-muted/20 border-border/30">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-pink-400" />
                  <h4 className="font-semibold">Instagram</h4>
                </div>
                <ol className="text-sm text-muted-foreground space-y-2 ml-7">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">1.</span>
                    Go to <strong className="text-foreground">Settings → Privacy and Security</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">2.</span>
                    Click <strong className="text-foreground">Data Download → Request Download</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">3.</span>
                    Format: <strong className="text-foreground">JSON</strong>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">4.</span>
                    Click <strong className="text-foreground">Submit Request</strong>
                  </li>
                </ol>
                <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-400">
                    ⏱ Instagram data download typically takes up to 48 hours.
                  </p>
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Transfer This App */}
        <AccordionItem value="transfer" className="border border-primary/10 rounded-lg px-1">
          <AccordionTrigger className="text-base font-semibold hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              How to Download & Re-Upload
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <Card className="bg-muted/20 border-border/30">
              <CardContent className="pt-4 space-y-3">
                <h4 className="font-semibold text-primary">Option 1: Save Data (AI Tab)</h4>
                <ol className="text-sm text-muted-foreground space-y-2 ml-4">
                  <li>1. Go to the <strong className="text-foreground">🧠 AI</strong> tab</li>
                  <li>2. Tap <strong className="text-foreground">💾 Save Data</strong> at the top right</li>
                  <li>3. This downloads a ZIP of all your case events (timeline data, file records)</li>
                  <li>4. Upload this ZIP back to any session using <strong className="text-foreground">📁 Cases → Import</strong></li>
                  <li>5. The app will restore all your events and you can keep analyzing</li>
                </ol>
                <div className="mt-2 p-2 rounded bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-400">
                    This is the best way to save your progress. The ZIP contains a timeline.json with all your extracted events and metadata.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/20 border-border/30">
              <CardContent className="pt-4 space-y-3">
                <h4 className="font-semibold text-primary">Option 2: Download the App (AI Tab)</h4>
                <ol className="text-sm text-muted-foreground space-y-2 ml-4">
                  <li>1. Go to the <strong className="text-foreground">🧠 AI</strong> tab</li>
                  <li>2. Tap <strong className="text-foreground">📦 Get App</strong> at the top right</li>
                  <li>3. This downloads the full app as a ZIP you can run yourself</li>
                  <li>4. After downloading BOTH (Save Data + Get App), you have everything you need</li>
                </ol>
              </CardContent>
            </Card>

            <Card className="bg-muted/20 border-border/30">
              <CardContent className="pt-4 space-y-3">
                <h4 className="font-semibold text-primary">Option 3: Export from Cases Tab</h4>
                <ol className="text-sm text-muted-foreground space-y-2 ml-4">
                  <li>1. In the <strong className="text-foreground">📁 Cases</strong> tab, tap the download icon on your case</li>
                  <li>2. This creates a ZIP with all your timeline events and uploaded files</li>
                  <li>3. Send that ZIP file to your AI (upload it in the chat)</li>
                  <li>4. The AI can import it to see everything you&apos;ve collected</li>
                </ol>
              </CardContent>
            </Card>

            <Card className="bg-muted/20 border-border/30">
              <CardContent className="pt-4 space-y-3">
                <h4 className="font-semibold text-primary">Run On Your Own Computer</h4>
                <ol className="text-sm text-muted-foreground space-y-2 ml-4">
                  <li>1. Download the app ZIP (from AI tab → 📦 Get App)</li>
                  <li>2. Install Node.js from <strong className="text-foreground">nodejs.org</strong></li>
                  <li>3. Extract the ZIP to a folder</li>
                  <li>4. Open terminal in that folder, run: <code className="bg-muted px-1 rounded text-xs">bash start.sh</code></li>
                  <li>5. Open <strong className="text-foreground">http://localhost:3000</strong> in your browser</li>
                  <li>6. Import your saved case data ZIP to continue working</li>
                </ol>
              </CardContent>
            </Card>

            <Card className="bg-muted/20 border-border/30">
              <CardContent className="pt-4 space-y-3">
                <h4 className="font-semibold text-primary">Docker (Advanced)</h4>
                <pre className="bg-background/80 p-3 rounded text-xs overflow-x-auto">
{`docker build -t osint-timeline .
docker run -p 3000:3000 \\
  -v ./cases:/app/cases \\
  -v ./db:/app/db \\
  osint-timeline`}
                </pre>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* File Types Supported */}
        <AccordionItem value="file-types" className="border border-primary/10 rounded-lg px-1">
          <AccordionTrigger className="text-base font-semibold hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              File Types Supported
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: <Archive className="h-4 w-4" />, name: 'Google Takeout ZIP', desc: 'My Activity, Location History, Chrome, Photos, YouTube', color: 'text-green-400' },
                { icon: <Archive className="h-4 w-4" />, name: 'Facebook Takeout ZIP', desc: 'Posts, messages, photos, profile data', color: 'text-blue-400' },
                { icon: <Archive className="h-4 w-4" />, name: 'Twitter Archive ZIP', desc: 'Tweets, messages, likes', color: 'text-sky-400' },
                { icon: <Globe className="h-4 w-4" />, name: 'Images (JPG, PNG, HEIC)', desc: 'EXIF data: GPS, timestamp, camera info', color: 'text-purple-400' },
                { icon: <Mic className="h-4 w-4" />, name: 'Audio (MP3, WAV, M4A, OGG)', desc: 'AI-powered transcription', color: 'text-amber-400' },
                { icon: <Database className="h-4 w-4" />, name: 'Chrome History SQLite', desc: 'Browser visit history with timestamps', color: 'text-cyan-400' },
                { icon: <FileJson className="h-4 w-4" />, name: 'JSON Data Dumps', desc: 'Any JSON with timestamped entries', color: 'text-yellow-400' },
                { icon: <Table className="h-4 w-4" />, name: 'CSV Data', desc: 'Comma-separated with date columns', color: 'text-orange-400' },
                { icon: <FileText className="h-4 w-4" />, name: 'Plain Text / Logs', desc: 'Date extraction from text', color: 'text-gray-400' },
                { icon: <FileText className="h-4 w-4" />, name: 'PDF Documents', desc: 'Text extraction with date parsing', color: 'text-red-400' },
              ].map((ft, i) => (
                <Card key={i} className="bg-muted/20 border-border/30">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-start gap-3">
                      <div className={ft.color}>{ft.icon}</div>
                      <div>
                        <p className="text-sm font-medium">{ft.name}</p>
                        <p className="text-xs text-muted-foreground">{ft.desc}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Audio Transcription */}
        <AccordionItem value="audio-transcription" className="border border-primary/10 rounded-lg px-1">
          <AccordionTrigger className="text-base font-semibold hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              Audio Transcription
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <Card className="bg-muted/20 border-border/30">
              <CardContent className="pt-4 space-y-3">
                <h4 className="font-semibold">How It Works</h4>
                <ol className="text-sm text-muted-foreground space-y-2 ml-4">
                  <li>1. Upload any supported audio file</li>
                  <li>2. The app detects it as an audio file automatically</li>
                  <li>3. Tap the <strong className="text-foreground">🎙 Transcribe</strong> button that appears</li>
                  <li>4. AI transcription runs on the server</li>
                  <li>5. Transcription appears as a timeline event with timestamps</li>
                </ol>
              </CardContent>
            </Card>

            <Card className="bg-muted/20 border-border/30">
              <CardContent className="pt-4 space-y-3">
                <h4 className="font-semibold">Supported Audio Formats</h4>
                <div className="flex flex-wrap gap-2">
                  {['MP3', 'WAV', 'M4A', 'OGG', 'FLAC', 'WEBM', 'AAC'].map(fmt => (
                    <Badge key={fmt} variant="outline" className="text-xs">
                      {fmt}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-400">
                💡 Tip: Shorter audio files process faster. For long recordings, consider splitting into segments under 10 minutes.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* AI Assistant */}
        <AccordionItem value="ai-assistant" className="border border-primary/10 rounded-lg px-1">
          <AccordionTrigger className="text-base font-semibold hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Assistant
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <Card className="bg-muted/20 border-border/30">
              <CardContent className="pt-4 space-y-3">
                <h4 className="font-semibold">Connecting an AI</h4>
                <p className="text-sm text-muted-foreground">
                  The AI Assistant can connect to different AI providers. Go to the <strong className="text-foreground">🧠 AI</strong> tab and open Settings to configure:
                </p>
                <ul className="text-sm text-muted-foreground space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">•</span>
                    <strong className="text-foreground">ZAI Built-in</strong> — No API key needed, works out of the box
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">•</span>
                    <strong className="text-foreground">OpenAI</strong> — Enter your OpenAI API key, choose GPT-4o or GPT-4o Mini
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">•</span>
                    <strong className="text-foreground">Google Gemini</strong> — Enter your Gemini API key, choose Gemini 2.0 Flash or 1.5 Pro
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">•</span>
                    <strong className="text-foreground">Custom Endpoint</strong> — Connect to any OpenAI-compatible API (Kai 9000, local LLMs, etc.)
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-muted/20 border-border/30">
              <CardContent className="pt-4 space-y-3">
                <h4 className="font-semibold">Auto-Analyze</h4>
                <p className="text-sm text-muted-foreground">
                  The <strong className="text-foreground">⚡ Auto-Analyze</strong> button runs a full timeline analysis automatically. The AI will identify:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {[
                    { type: 'Patterns', color: 'text-green-400', desc: 'Recurring behaviors' },
                    { type: 'Anomalies', color: 'text-red-400', desc: 'Breaking patterns' },
                    { type: 'Clusters', color: 'text-blue-400', desc: 'Time clusters' },
                    { type: 'Gaps', color: 'text-amber-400', desc: 'Missing periods' },
                    { type: 'Locations', color: 'text-purple-400', desc: 'Location patterns' },
                    { type: 'Behavioral', color: 'text-pink-400', desc: 'Lifestyle insights' },
                    { type: 'Connections', color: 'text-cyan-400', desc: 'Cross-source links' },
                  ].map(item => (
                    <div key={item.type} className="p-2 rounded border border-border/20 bg-background/30">
                      <p className={`text-xs font-medium ${item.color}`}>{item.type}</p>
                      <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-400">
                Tip: API keys are only stored in your browser session and are never saved to disk. You&apos;ll need to re-enter them if you refresh the page.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Visual Timeline & Deleting Events */}
        <AccordionItem value="visual-timeline" className="border border-primary/10 rounded-lg px-1">
          <AccordionTrigger className="text-base font-semibold hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Visual Timeline & Deleting Events
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <Card className="bg-muted/20 border-border/30">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <LayoutList className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Timeline Views</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Switch between two views in the Timeline tab:
                </p>
                <ul className="text-sm text-muted-foreground space-y-2 ml-4">
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">•</span>
                    <strong className="text-foreground">List View</strong> — Traditional chronological list with collapsible details
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary font-bold shrink-0">•</span>
                    <strong className="text-foreground">Visual View</strong> — Flow chart style with alternating cards branching from a central timeline spine, color-coded by source
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-muted/20 border-border/30">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-destructive" />
                  <h4 className="font-semibold">Deleting Events</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  If you accidentally add something or want to remove an event:
                </p>
                <ol className="text-sm text-muted-foreground space-y-2 ml-4">
                  <li>1. Expand the event by clicking/tapping on it</li>
                  <li>2. Click the <strong className="text-destructive">🗑 Delete</strong> button that appears</li>
                  <li>3. Confirm the deletion</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-2">
                  This works in both List and Visual timeline views. Deleted events are permanently removed.
                </p>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* Tips & Troubleshooting */}
        <AccordionItem value="tips" className="border border-primary/10 rounded-lg px-1">
          <AccordionTrigger className="text-base font-semibold hover:no-underline py-3">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Tips & Troubleshooting
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-4">
            <div className="space-y-3">
              {[
                {
                  title: 'Large ZIP files',
                  tip: 'Google Takeout ZIPs can be very large. The app processes them on the server, so upload time depends on your connection speed.'
                },
                {
                  title: 'No events extracted',
                  tip: 'If you get 0 events, try: (1) Click the "Re-process" button on the file to retry with a more aggressive parser, (2) Make sure your ZIP actually contains timestamped data (My Activity, Location History, etc.), (3) Some exports like BumbleUp wrap Google data in custom folders — the app should detect these automatically.'
                },
                {
                  title: 'Wrong file type detected',
                  tip: 'The app auto-detects based on filename and contents. If detection is wrong, the file will still be processed as a generic text/JSON file.'
                },
                {
                  title: 'Audio transcription fails',
                  tip: 'Transcription requires an internet connection and the AI service. Very long or corrupted files may fail. Try shorter clips.'
                },
                {
                  title: 'Browser history import',
                  tip: 'Chrome History is stored in a SQLite file. On Android: /data/data/com.android.chrome/app_chrome/Default/History. On desktop: ~/Library/Application Support/Google/Chrome/Default/History (macOS) or %LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\History (Windows).'
                },
                {
                  title: 'Privacy & Security',
                  tip: 'All data is stored locally on this server. No data is sent to external services except for audio transcription. You can delete cases at any time.'
                },
              ].map((item, i) => (
                <Card key={i} className="bg-muted/20 border-border/30">
                  <CardContent className="pt-3 pb-3">
                    <h4 className="text-sm font-medium mb-1">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">{item.tip}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
}
