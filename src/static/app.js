document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Clear and repopulate the activity select (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants list HTML (each participant has a remove button)
        const participantsHtml = details.participants && details.participants.length
          ? `<div class="participants"><h5>Participants</h5><ul>${details.participants.map(p => `<li><span class="participant-email">${p}</span><button class="remove-btn" data-activity="${name}" data-email="${p}" aria-label="Remove ${p}">✖</button></li>`).join('')}</ul></div>`
          : `<div class="participants"><h5>Participants</h5><p class="info">No one has signed up yet.</p></div>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHtml}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();
        // Refresh activities to show updated participants and availability
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Delegate remove button clicks using event delegation on activitiesList
  activitiesList.addEventListener('click', async (ev) => {
    const btn = ev.target.closest && ev.target.closest('.remove-btn');
    if (!btn) return;

    const activityName = btn.getAttribute('data-activity');
    const email = btn.getAttribute('data-email');

    if (!activityName || !email) return;

    try {
      const resp = await fetch(`/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`, { method: 'DELETE' });
      const result = await resp.json();

      if (resp.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = 'message success';
        messageDiv.classList.remove('hidden');
        // Refresh list
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || 'Failed to remove participant';
        messageDiv.className = 'message error';
        messageDiv.classList.remove('hidden');
      }

      setTimeout(() => messageDiv.classList.add('hidden'), 4000);
    } catch (err) {
      console.error('Error removing participant:', err);
      messageDiv.textContent = 'Failed to remove participant';
      messageDiv.className = 'message error';
      messageDiv.classList.remove('hidden');
      setTimeout(() => messageDiv.classList.add('hidden'), 4000);
    }
  });

  // Initialize app
  fetchActivities();
});
