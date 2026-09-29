export interface HeicScenarioStep {
  title: string;
  text: string;
}

export interface HeicScenarioFAQItem {
  question: string;
  answer: string;
}

export interface HeicScenarioConfig {
  id: string;
  path: string;
  label: string;
  title: string;
  description: string;
  pageTitle: string;
  pageDescription: string;
  introHtml: string;
  whyHtml: string;
  steps: HeicScenarioStep[];
  faq: HeicScenarioFAQItem[];
  related?: { label: string; path: string; description: string }[];
  howToName?: string;
}

export const HEIC_SCENARIOS: HeicScenarioConfig[] = [
  {
    id: "to-jpg",
    path: "/heic/to-jpg",
    label: "HEIC to JPG",
    title: "HEIC to JPG Converter - Free, No Upload",
    description:
      "Convert HEIC photos to JPG or PNG in your browser. Batch, no limits, no sign-up - files never leave your device.",
    pageTitle: "HEIC to JPG Converter - Free Batch, No Upload, No Sign Up",
    pageDescription:
      "Convert iPhone HEIC photos to JPG or PNG right in your browser. Batch convert whole albums, choose quality, download as ZIP. No upload, no sign-up.",
    introHtml: `
      <p class="mb-4 text-muted-foreground">
        HEIC is the format iPhones shoot in by default: roughly half the file size of JPG at the same quality.
        The catch is compatibility - Windows, most websites, many design tools and anything outside the Apple
        ecosystem still expect plain JPG or PNG. This converter turns your HEIC photos into universally accepted
        files, entirely on your device.
      </p>
      <p class="mb-4 text-muted-foreground">
        Server-based converters make you upload every photo to someone's cloud first - slow on big albums, and a
        privacy question for personal pictures. Here the conversion runs locally in your browser: drop a whole
        folder, convert in one batch, download as a ZIP.
      </p>
      <ul class="mb-6 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Batch convert - no per-file or daily limits, ZIP download</li>
        <li>JPG with a quality slider (default 85) or lossless PNG</li>
        <li>Metadata stripped on convert: GPS, camera and timestamps do not carry over</li>
        <li>Zero bytes uploaded - works offline once the page has loaded</li>
      </ul>
      <p class="text-muted-foreground">
        Curious what data your photos carry? Check them with an EXIF viewer before sharing - GPS coordinates
        included.
      </p>
    `,
    whyHtml: `
      <p class="mb-4 text-muted-foreground">
        HEIC is technically superior to JPG: better compression, support for transparency, bursts and depth maps.
        The problem is adoption. Outside the Apple ecosystem most operating systems, web forms, printers and design
        tools either cannot open it or handle it poorly. Converting to JPG or PNG removes that friction while
        keeping the photo itself intact.
      </p>
      <p class="text-muted-foreground">
        Because the conversion happens in your browser, you also avoid the privacy trade-off of online converters:
        your photos are never uploaded, and metadata is stripped from the output by default.
      </p>
    `,
    steps: [
      {
        title: "Drop your HEIC files",
        text: "Drag a photo or a whole folder into the tool - or tap to pick files on mobile. Everything loads into browser memory only.",
      },
      {
        title: "Choose format and quality",
        text: "JPG is the right default for sharing and uploads; the quality slider (85 is a good balance) trades size against detail. Pick PNG only when you need a lossless result.",
      },
      {
        title: "Convert",
        text: "Hit Convert and watch the batch progress. Each file is decoded and re-encoded locally - speed depends on your device, not on your connection.",
      },
      {
        title: "Download",
        text: "Save files one by one or grab everything as a ZIP. Originals are never modified.",
      },
    ],
    faq: [
      {
        question: "What is a HEIC file?",
        answer:
          "HEIC is Apple's container for HEIF images, compressed with the HEVC codec. iPhones have saved photos this way by default since iOS 11: same visual quality as JPG at roughly half the size. The downside is support - outside Apple devices, HEIC often won't open or upload.",
      },
      {
        question: "Will converting HEIC to JPG reduce quality?",
        answer:
          "JPG is a lossy format, so a small amount of recompression happens - at quality 85-90 it is invisible in practice. If you need a mathematically lossless result, choose PNG (files will be noticeably larger).",
      },
      {
        question: "Do my photos get uploaded anywhere?",
        answer:
          "No. Conversion runs entirely in your browser via WebAssembly - you can load this page, go offline, and it still works. Your photos never leave your device.",
      },
      {
        question: "What happens to EXIF data and GPS location?",
        answer:
          "Converted files come out clean: EXIF, GPS coordinates and timestamps are stripped during conversion. That is the safe default for sharing - if you need to inspect the metadata first, use an EXIF viewer.",
      },
      {
        question: "Is there a limit on file count or size?",
        answer:
          "No account-based limits. The practical ceiling is your device's memory: 50 MB per file, and very large batches are processed in sequence with progress shown - if a file fails, the rest of the batch continues.",
      },
      {
        question: "How do I stop my iPhone from shooting HEIC?",
        answer:
          "Settings -> Camera -> Formats -> Most Compatible makes the camera save JPG instead. Existing photos stay HEIC - convert them here.",
      },
    ],
    related: [
      {
        label: "HEIC won't open on Windows",
        path: "/heic/wont-open-on-windows",
        description: "Quick fix for Windows 10/11 without installing codecs.",
      },
      {
        label: "Can't upload HEIC",
        path: "/heic/cant-upload",
        description: "Fix upload forms and websites that reject iPhone photos.",
      },
      {
        label: "Convert HEIC on iPhone",
        path: "/heic/convert-on-iphone",
        description: "No app needed - convert directly in Safari.",
      },
      {
        label: "HEIC not supported in Canva",
        path: "/heic/not-supported-in-canva",
        description: "Get Canva-compatible JPG or PNG files in seconds.",
      },
    ],
  },
  {
    id: "wont-open-on-windows",
    path: "/heic/wont-open-on-windows",
    label: "HEIC Won't Open on Windows",
    title: "HEIC File Won't Open on Windows 11 - Quick Fix, No Upload",
    description:
      "HEIC photos from iPhone won't open on Windows 10/11. Convert them to JPG right here - free, no upload, no codecs to install.",
    pageTitle: "HEIC File Won't Open on Windows 11 - Quick Fix, No Upload",
    pageDescription:
      "iPhone HEIC photos don't open on Windows? Convert them to JPG directly on this page - free, no upload, no sign-up. Or install the codecs: instructions inside.",
    howToName: "How to open HEIC files on Windows",
    introHtml: `
      <p class="mb-4 text-muted-foreground">
        You copied photos from an iPhone to a Windows PC, double-clicked - and got "we can't open this file" or
        a blank Photos app. Nothing is wrong with the files: they are HEIC, Apple's default photo format, and
        Windows doesn't understand it out of the box.
      </p>
      <p class="mb-4 text-muted-foreground">
        <strong class="text-foreground">Fastest fix:</strong> convert the photos to JPG with the tool above -
        right here, without uploading anything. If you'd rather teach Windows to open HEIC natively, the
        step-by-step instructions are below.
      </p>
    `,
    whyHtml: `
      <p class="mb-4 text-muted-foreground">
        HEIC is a container; the image inside is compressed with the HEVC (H.265) video codec. Windows 10 and 11
        ship without the required decoders. Microsoft distributes them separately through the Store:
        "HEIF Image Extensions" (free) and the HEVC codec, which is either bundled with your device
        ("HEVC Video Extensions from Device Manufacturer", free) or sold as "HEVC Video Extensions". Until both
        are installed, Explorer thumbnails stay blank and the Photos app refuses the file.
      </p>
      <p class="text-muted-foreground">
        Even with codecs installed, HEIC keeps causing friction downstream - many Windows applications,
        upload forms and printers still won't accept it. Converting to JPG once removes the problem everywhere
        at once.
      </p>
    `,
    steps: [
      {
        title: "Quick fix - convert here",
        text: "Drop the HEIC files into the converter above and download JPGs. Nothing is uploaded; it works offline once loaded.",
      },
      {
        title: "Native option - install the codecs",
        text: `Open Microsoft Store and install "HEIF Image Extensions" (free). If Photos still can't open the files, also install the HEVC codec: "HEVC Video Extensions from Device Manufacturer" (free) or "HEVC Video Extensions" (paid).`,
      },
      {
        title: "Restart the Photos app",
        text: "Close and reopen Photos (or Explorer) after installing - thumbnails and preview should start working.",
      },
      {
        title: "Prevent it next time",
        text: "On the iPhone: Settings -> Camera -> Formats -> Most Compatible makes new photos plain JPG. For transfers, Settings -> Photos -> Transfer to Mac or PC -> Automatic converts HEIC to JPG on the fly.",
      },
    ],
    faq: [
      {
        question: "Why won't Windows 11 open my iPhone photos?",
        answer:
          `iPhones save photos as HEIC, which is compressed with the HEVC codec. Windows doesn't include HEIF/HEVC decoders by default - you need the free "HEIF Image Extensions" plus an HEVC codec from the Microsoft Store, or you can simply convert the files to JPG.`,
      },
      {
        question: "Is the HEIF codec for Windows free?",
        answer:
          `"HEIF Image Extensions" is free. The HEVC part depends on your device: many PCs qualify for the free "HEVC Video Extensions from Device Manufacturer"; otherwise Microsoft sells "HEVC Video Extensions". Converting to JPG on this page needs neither.`,
      },
      {
        question: "Will converting to JPG lose quality?",
        answer:
          "A small amount of recompression is unavoidable with JPG, but at the default quality setting it is invisible in practice. For a lossless result, convert to PNG instead.",
      },
      {
        question: "Is it safe to convert my photos here?",
        answer:
          "Yes - the converter runs entirely in your browser. Photos are never uploaded: you can disconnect from the internet after the page loads and conversion still works.",
      },
    ],
  },
  {
    id: "cant-upload",
    path: "/heic/cant-upload",
    label: "Can't Upload HEIC",
    title: "Why Can't I Upload HEIC? Convert to JPG - Free, No Upload",
    description:
      "Website rejects your iPhone HEIC photo? Convert it to JPG right here - free, no upload of your files, no sign-up.",
    pageTitle: "Why Can't I Upload HEIC? Convert to JPG - Free, No Upload",
    pageDescription:
      "Upload form doesn't accept HEIC photos from your iPhone? Convert them to JPG in your browser - free, no sign-up, files never leave your device.",
    howToName: "How to upload HEIC files to websites",
    introHtml: `
      <p class="mb-4 text-muted-foreground">
        The upload button says "unsupported file type", the form silently resets, or the site claims your photo
        is "not an image". The file is fine - it's HEIC, the format iPhones shoot in, and most websites simply
        don't accept it. Their servers and the tools they embed expect JPG, PNG, maybe WebP - HEIC support is
        still rare outside Apple.
      </p>
      <p class="mb-4 text-muted-foreground">
        <strong class="text-foreground">Fix:</strong> convert the photo to JPG with the tool above - it takes
        seconds, and your files never leave your device.
      </p>
    `,
    whyHtml: `
      <p class="mb-4 text-muted-foreground">
        Accepting an image on a website means decoding it somewhere: in the browser for previews, on the server
        for storage and thumbnails. HEIC requires an HEVC decoder that browsers don't ship (patent licensing) and
        that most web stacks don't bundle. That's why the same photo uploads fine as a JPG and fails as HEIC -
        on marketplaces, government forms, CMSs like WordPress, and even some design tools.
      </p>
      <p class="text-muted-foreground">
        Converting before uploading also protects you: the JPG this tool produces has metadata (including GPS
        location) stripped, which is what you want when posting photos publicly.
      </p>
    `,
    steps: [
      {
        title: "Convert the photo to JPG",
        text: "Drop the HEIC file into the converter above, keep the default quality, download the JPG.",
      },
      {
        title: "Retry the upload",
        text: "Attach the converted JPG - the form will accept it.",
      },
      {
        title: "If the site still complains about size",
        text: "Lower the quality slider a step (85 -> 75) and convert again: the JPG will come out smaller.",
      },
      {
        title: "Make it permanent",
        text: "On your iPhone: Settings -> Camera -> Formats -> Most Compatible shoots JPG from now on, so the problem stops recurring.",
      },
    ],
    faq: [
      {
        question: "Why do websites reject HEIC files?",
        answer:
          "HEIC needs an HEVC decoder to process, and neither browsers nor most server-side stacks include one (patent licensing). Sites that accept 'images' almost always mean JPG, PNG, GIF or WebP - not HEIC.",
      },
      {
        question: "Which sites does this affect?",
        answer:
          "Most of them: online marketplaces, government and visa forms, WordPress and other CMSs, website builders, older email clients. Apple services and modern Mac/iOS apps are the exception.",
      },
      {
        question: "Does converting to JPG lose quality?",
        answer:
          "JPG recompresses the image slightly, but at the default quality the difference is invisible. Choose PNG if the site accepts it and you need a lossless file.",
      },
      {
        question: "Is my photo uploaded to your server?",
        answer:
          "No - the opposite: your photo never leaves your device. Conversion happens locally in your browser, which is also why there are no size quotas beyond your device's memory.",
      },
      {
        question: "Will the converted JPG keep my location data?",
        answer:
          "No. Conversion strips EXIF metadata, including GPS coordinates and timestamps. That's the safe default for public uploads - verify any photo first with an EXIF viewer if you're unsure.",
      },
    ],
  },
  {
    id: "convert-on-iphone",
    path: "/heic/convert-on-iphone",
    label: "Convert HEIC on iPhone",
    title: "Convert HEIC to JPG on iPhone Without an App - Free",
    description:
      "Convert HEIC photos to JPG right on your iPhone - no app to install, no upload. Free, works in Safari.",
    pageTitle: "Convert HEIC to JPG on iPhone Without an App - Free",
    pageDescription:
      "Turn iPhone HEIC photos into JPG directly in Safari - no app, no upload, no sign-up. Batch convert and download.",
    howToName: "How to convert HEIC to JPG on iPhone",
    introHtml: `
      <p class="mb-4 text-muted-foreground">
        Need a JPG version of a photo, right now, on your iPhone? You don't need an app for that. This page is
        the converter: it runs in Safari, processes photos on the phone itself, and works even in airplane mode
        once loaded. Drop the photos in, get JPGs out.
      </p>
      <p class="mb-4 text-muted-foreground">
        Below are also the built-in iOS ways to deal with HEIC - for future shots and for sharing - so you can
        pick whichever fits.
      </p>
    `,
    whyHtml: `
      <p class="mb-4 text-muted-foreground">
        iPhones shoot HEIC because it halves storage at equal quality, and iOS handles the conversion
        transparently in some places - emailing a photo or sharing to a non-Apple device often produces a JPG
        automatically. The gaps show up when a website or app demands a file from your library as-is: then you
        get the raw HEIC, and the receiving side chokes on it.
      </p>
      <p class="text-muted-foreground">
        A local converter closes that gap without trade-offs: no app install, no account, and - unlike converter
        apps full of ads and subscriptions - your photos never leave the phone.
      </p>
    `,
    steps: [
      {
        title: "Convert here in Safari",
        text: "Tap the tool above, choose photos from your library or Files, and convert. On a phone, a handful of photos per batch converts fastest.",
      },
      {
        title: "Save the results",
        text: "Download the JPGs - they land in Downloads in the Files app, ready to upload or share.",
      },
      {
        title: "Built-in option for future shots",
        text: "Settings -> Camera -> Formats -> Most Compatible: the camera saves JPG from now on (files get roughly twice as big).",
      },
      {
        title: "Built-in option for sharing",
        text: "Settings -> Photos -> Transfer to Mac or PC -> Automatic: iOS converts HEIC to JPG automatically when you share or copy photos to non-Apple destinations.",
      },
    ],
    faq: [
      {
        question: "Can I convert HEIC to JPG on iPhone without an app?",
        answer:
          "Yes - this page does it in Safari. The conversion runs on your iPhone itself: no app install, no account, and photos are never uploaded.",
      },
      {
        question: "How do I make my iPhone shoot JPG instead of HEIC?",
        answer:
          "Settings -> Camera -> Formats -> Most Compatible. Existing HEIC photos stay as they are - convert them with the tool above.",
      },
      {
        question: "Does iPhone convert HEIC automatically when sharing?",
        answer:
          "Often, yes: with Settings -> Photos -> Transfer to Mac or PC set to Automatic, iOS sends a JPG to non-Apple devices and many apps. But uploads from the photo library to websites usually pass the original HEIC through - that's when you need to convert first.",
      },
      {
        question: "Where do converted photos go?",
        answer:
          "Downloads from Safari land in the Files app (Downloads folder by default). From there you can save them back to Photos, attach or upload them.",
      },
      {
        question: "Is it private?",
        answer:
          "Fully. Everything happens on your phone - you can enable airplane mode after the page loads and conversion still works. There is no upload and no tracking of your files.",
      },
    ],
  },
  {
    id: "not-supported-in-canva",
    path: "/heic/not-supported-in-canva",
    label: "HEIC Not Supported in Canva",
    title: "HEIC Not Supported in Canva? Quick Fix",
    description:
      "Canva won't take your iPhone HEIC photos? Convert them to JPG or PNG first - free, no upload, right here.",
    pageTitle: "HEIC Not Supported in Canva - Convert to JPG Free, No Upload",
    pageDescription:
      "Canva rejects HEIC photos from your iPhone? Convert them to JPG or PNG in your browser in seconds - free, no sign-up, files stay on your device.",
    howToName: "How to use HEIC files in Canva",
    introHtml: `
      <p class="mb-4 text-muted-foreground">
        You drag an iPhone photo into a Canva design and get "file type not supported" - or the upload just
        silently does nothing. Canva's editor works with JPG, PNG, SVG and a few others; HEIC isn't on the list.
      </p>
      <p class="mb-4 text-muted-foreground">
        <strong class="text-foreground">Fix:</strong> convert the photo with the tool above - JPG for photos,
        PNG if you need maximum fidelity - and drop the result into Canva. Conversion happens locally in your
        browser: your photos are never uploaded anywhere, here or elsewhere.
      </p>
    `,
    whyHtml: `
      <p class="mb-4 text-muted-foreground">
        Browser-based design tools decode images inside your browser or on their servers - and neither ships an
        HEVC decoder (HEIC's compression codec), largely because of patent licensing. That's why the same photo
        works fine in Apple Photos but bounces off Canva, most web editors, and some desktop apps.
      </p>
      <p class="text-muted-foreground">
        A note on quality for design work: converting to JPG at the default setting is fine for web graphics.
        If the image will be edited further (filters, resizing, text overlays), convert to PNG instead - it's
        lossless and won't accumulate compression artifacts.
      </p>
    `,
    steps: [
      {
        title: "Convert the HEIC photo",
        text: "Drop the file into the converter above. Choose JPG for regular photos; choose PNG if the image will be edited further in Canva (lossless, no compression artifacts).",
      },
      {
        title: "Upload the converted file to Canva",
        text: "Drag the JPG/PNG into your design - it uploads like any standard image.",
      },
      {
        title: "Batch-convert a whole set",
        text: "Working on a carousel or album? Drop all photos at once and download a ZIP of converted files.",
      },
      {
        title: "Same fix for other tools",
        text: "The converted files work anywhere HEIC fails - Figma, website builders, presentation tools, print services.",
      },
    ],
    faq: [
      {
        question: "Does Canva support HEIC files?",
        answer:
          "No. Canva accepts JPG, PNG, SVG, WebP, GIF and a few video formats - HEIC from iPhones is not supported and is rejected on upload. Converting to JPG or PNG first solves it.",
      },
      {
        question: "JPG or PNG for Canva?",
        answer:
          "JPG at quality 85+ is fine for photos used as-is. If you plan to edit the image heavily - filters, crops, overlays, re-export - PNG is safer because it doesn't add new compression artifacts each time you save.",
      },
      {
        question: "What about Figma and Photoshop?",
        answer:
          "Support varies by app and version, but the universal answer is the same: convert to JPG or PNG first and every editor will accept the file. The converter above does it locally in your browser.",
      },
      {
        question: "Does converting reduce image quality?",
        answer:
          "JPG slightly recompresses (invisible at the default quality); PNG is fully lossless. Either way the converted file keeps the original resolution.",
      },
      {
        question: "Are my photos uploaded to your servers?",
        answer:
          "No. The converter runs entirely in your browser - useful double protection here, since your client work or unreleased designs never touch a third-party server.",
      },
    ],
  },
];

export function getHeicScenarioByPath(path: string): HeicScenarioConfig | undefined {
  return HEIC_SCENARIOS.find((s) => s.path === path);
}

export function getHeicScenarioById(id: string): HeicScenarioConfig | undefined {
  return HEIC_SCENARIOS.find((s) => s.id === id);
}
