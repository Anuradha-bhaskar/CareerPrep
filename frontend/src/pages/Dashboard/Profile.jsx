import React from "react";
import { useUser } from "@clerk/clerk-react";
import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Profile() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();

  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [interviews, setInterviews] = useState([]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!isSignedIn) return;
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const token = await getToken();
        const r = await fetch("http://localhost:8000/api/practice/interview-history", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error("Failed to load interview history");
        const data = await r.json();
        setInterviews(Array.isArray(data?.interviews) ? data.interviews : []);
      } catch (e) {
        setHistoryError(e.message || "Could not load interview history");
      } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, [isSignedIn, getToken]);

  if (!isLoaded) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-lg">
        Loading...
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-lg">
        Sign in to view your profile.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">Profile</h1>

      <div className="flex items-center gap-6 mb-6">
        <img
          src={user.imageUrl}
          alt="User Avatar"
          className="w-24 h-24 rounded-full border-4 border-indigo-200 object-cover"
        />
        <div>
          <div className="text-xl font-semibold">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-gray-600">
            {user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress}
          </div>
          <div className="text-gray-500 text-sm mt-1">User</div>
        </div>
      </div>

    </div>
  );
}
