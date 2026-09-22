"use client"

import Profile from "../../profile/page"
import { CareerInterestsPanel } from "@/components/onboarding/career-interests-panel"

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 p-4 md:p-6">
      <Profile />

      {/*
        The onboarding answers, where a learner can change them (ONB-001 §26).
        Below the profile rather than inside it: the profile page is shared
        across roles, and these questions are the learner's.
      */}
      <div className="mx-auto mt-6 w-full max-w-[1100px]">
        <CareerInterestsPanel />
      </div>
    </div>
  )
}