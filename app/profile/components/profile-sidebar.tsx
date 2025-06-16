"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Award, Star } from "lucide-react"
import { useAuth } from "@/lib/context/auth-context"
import { useProgress } from "@/lib/context/progress-context"

export function ProfileSidebar() {
  const { state: authState } = useAuth()
  const { state: progressState } = useProgress()

  // Get total problems count from questions.json
  const questions = require("@/app/dsa-tutor/questions.json")
  const totalProblems = questions.length

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={authState.user?.avatar || "/abstract-geometric-shapes.png"} alt="User" />
            <AvatarFallback>{authState.user?.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-bold mb-1">{authState.user?.name || "Guest User"}</h2>
          <p className="text-muted-foreground mb-4">{authState.user?.role || "Software Engineer"}</p>

          <div className="w-full mt-4 space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Problems Solved</span>
                <span className="text-sm font-medium">
                  {progressState.totalSolved}/{totalProblems}
                </span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${(progressState.totalSolved / totalProblems) * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium">Streak</span>
                <span className="text-sm font-medium">{progressState.streak} days</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(progressState.streak * 10, 100)}%` }}
                ></div>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center p-3 bg-muted rounded-md">
                <Award className="h-5 w-5 mb-1 text-primary" />
                <span className="text-sm font-medium">Rank</span>
                <span className="text-lg font-bold">{progressState.totalSolved > 0 ? "Beginner" : "-"}</span>
              </div>

              <div className="flex flex-col items-center p-3 bg-muted rounded-md">
                <Star className="h-5 w-5 mb-1 text-yellow-500" />
                <span className="text-sm font-medium">Points</span>
                <span className="text-lg font-bold">{progressState.totalSolved * 10}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
