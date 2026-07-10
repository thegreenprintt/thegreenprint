"use client";
import { useState } from "react";



export default function OnboardPage() {



const APPS = [
  { name: "1House", desc: "Community platform", ios: "https://apps.apple.com/us/app/1house/id6754260060", android: "" },
  { name: "TradingView", desc: "Charts & analysis", ios: "https://apps.apple.com/us/app/tradingview-stock-market/id1205990992", android: "https://play.google.com/store/apps/details?id=com.tradingview.tradingviewapp" },
  { name: "TradeLocker", desc: "Trading platform", ios: "https://apps.apple.com/us/app/tradelocker/id6447196449", android: "https://play.google.com/store/apps/details?id=com.tradelocker.mobile" },
  { name: "Zoom", desc: "Live sessions", ios: "https://apps.apple.com/us/app/zoom-one-platform-to-connect/id546505307", android: "https://play.google.com/store/apps/details?id=us.zoom.videomeetings" },
  { name: "Telegram", desc: "Community chat", ios: "https://apps.apple.com/us/app/telegram-messenger/id686449807", android: "https://play.google.com/store/apps/details?id=org.telegram.messenger" },
  { name: "Boards", desc: "Task management", ios: "https://apps.apple.com/us/app/boards-com/id1507677341", android: "" },
];




const BROKER_STEPS = [
  { n: 1, title: "Create Your GenesisFX Account", desc: "Sign up at GenesisFX using the link below.", href: "https://dashboard.genesisfxmarkets.com/auth/register?ref=JACWAL843", linkLabel: "Open GenesisFX" },
  { n: 2, title: "Verify Your Identity", desc: "Complete KYC verification — takes about 5 minutes. Have your ID ready." },
  { n: 3, title: "Download TradeLocker", desc: "Install TradeLocker from the App Store or Google Play, then open the app." },
];




const DEMO_STEPS = [
  { n: 1, title: "Open the Menu", desc: "Tap the 3 lines in the top left corner of TradeLocker." },
  { n: 2, title: "Press TradeLocker", desc: "Tap TradeLocker from the menu to access account options." },
  { n: 3, title: "Select New Account", desc: "Tap New Account to begin setting up your demo." },
  { n: 4, title: "Set Account Type to Demo", desc: "On the first dropdown, switch it from Live to Demo." },
  { n: 5, title: "Name Your Account", desc: "In the second field, type a name — keep it simple, like Demo." },
  { n: 6, title: "Keep the Broker as GenFX", desc: "Leave the third option set to GenFX or Standard — don't change it." },
  { n: 7, title: "Set Leverage to 1:500", desc: "Change the leverage setting to 1:500." },
  { n: 8, title: "Set Account Size", desc: "Keep it at $10,000 or change it to whatever amount you want to practice with. Then confirm to create the account." },
];




const ARIN_CLIPS = [
  { n: 1, title: "New Trader Start Here", desc: "Begin here — no exceptions." },
  { n: 2, title: "Market Basics", desc: "Foundation for everything we do." },
