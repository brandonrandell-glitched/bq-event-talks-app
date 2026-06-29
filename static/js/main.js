document.addEventListener('DOMContentLoaded', () => {
    // State management
    let allNotes = [];
    let activeCategory = 'all';
    let searchQuery = '';
    let selectedNote = null;
    let savedNoteIds = new Set(JSON.parse(localStorage.getItem('bq_saved_notes') || '[]'));
    let activeHashtags = new Set(['#BigQuery', '#GoogleCloud']);

    // DOM Elements
    const notesContainer = document.getElementById('notes-container');
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshSpinner = document.getElementById('refresh-spinner');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const filterContainer = document.getElementById('filter-container');
    const lastSyncTimeEl = document.getElementById('last-sync-time');
    
    // Tweet Studio DOM Elements
    const composerEmpty = document.getElementById('tweet-composer-empty');
    const composerActive = document.getElementById('tweet-composer-active');
    const selectedTypeBadge = document.getElementById('selected-type-badge');
    const selectedDateEl = document.getElementById('selected-date');
    const selectedSnippetEl = document.getElementById('selected-snippet');
    const tweetTextArea = document.getElementById('tweet-text-area');
    const charCountEl = document.getElementById('char-count');
    const btnPostTweet = document.getElementById('btn-post-tweet');
    const btnCopyTweet = document.getElementById('btn-copy-tweet');
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Fetch notes on page load
    fetchNotes(false);

    // Event Listeners
    refreshBtn.addEventListener('click', () => fetchNotes(true));

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        if (searchQuery) {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
        }
        renderNotes();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.classList.add('hidden');
        renderNotes();
    });

    filterContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.pill');
        if (!pill) return;
        
        document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeCategory = pill.dataset.category;
        renderNotes();
    });

    // Hashtag Chips Event Listeners
    document.querySelectorAll('.hashtag-chips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const tag = chip.dataset.tag;
            if (activeHashtags.has(tag)) {
                activeHashtags.delete(tag);
                chip.classList.remove('active');
            } else {
                activeHashtags.add(tag);
                chip.classList.add('active');
            }
            if (selectedNote) {
                generateTweetText();
            }
        });
    });

    tweetTextArea.addEventListener('input', () => {
        updateCharCount();
    });

    btnPostTweet.addEventListener('click', () => {
        const text = tweetTextArea.value.trim();
        if (!text) return;
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(tweetUrl, '_blank');
    });

    btnCopyTweet.addEventListener('click', () => {
        const text = tweetTextArea.value.trim();
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            showToast("Tweet copied to clipboard! 📋");
        });
    });

    // Helper string strip
    String.prototype.strip = function() {
        return this.trim();
    };

    // Main Fetch Function
    async function fetchNotes(isRefresh = false) {
        setLoadingState(true);
        try {
            const url = isRefresh ? '/api/notes?refresh=true' : '/api/notes';
            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                allNotes = data.notes;
                updateSyncTime(data.last_updated);
                updateCategoryCounts();
                renderNotes();
                if (isRefresh) {
                    showToast("Release notes refreshed successfully! 🚀");
                }
            } else {
                showToast("Failed to load notes: " + (data.error || "Unknown error"));
            }
        } catch (err) {
            console.error("Error fetching notes:", err);
            showToast("Network error while fetching release notes.");
        } finally {
            setLoadingState(false);
        }
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            refreshSpinner.classList.add('spinning');
            refreshBtn.disabled = true;
        } else {
            refreshSpinner.classList.remove('spinning');
            refreshBtn.disabled = false;
        }
    }

    function updateSyncTime(timestamp) {
        if (!timestamp) return;
        const date = new Date(timestamp * 1000);
        lastSyncTimeEl.textContent = `Updated ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    function updateCategoryCounts() {
        const counts = {
            all: allNotes.length,
            Feature: 0,
            Changed: 0,
            Deprecated: 0,
            Fix: 0,
            saved: savedNoteIds.size
        };

        allNotes.forEach(note => {
            const type = note.type === 'Change' ? 'Changed' : note.type;
            if (counts.hasOwnProperty(type)) {
                counts[type]++;
            }
        });

        document.getElementById('count-all').textContent = counts.all;
        document.getElementById('count-feature').textContent = counts.Feature;
        document.getElementById('count-changed').textContent = counts.Changed;
        document.getElementById('count-deprecated').textContent = counts.Deprecated;
        document.getElementById('count-fix').textContent = counts.Fix;
        document.getElementById('count-saved').textContent = counts.saved;
    }

    // Render Notes List based on active filters & search query
    function renderNotes() {
        const filtered = allNotes.filter(note => {
            // Category check
            const noteType = note.type === 'Change' ? 'Changed' : note.type;
            if (activeCategory === 'saved') {
                if (!savedNoteIds.has(note.id)) return false;
            } else if (activeCategory !== 'all' && noteType !== activeCategory) {
                return false;
            }

            // Search query check
            if (searchQuery) {
                const matchText = (note.date + ' ' + note.type + ' ' + note.text).toLowerCase();
                if (!matchText.includes(searchQuery)) return false;
            }

            return true;
        });

        if (filtered.length === 0) {
            notesContainer.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
                    <div style="font-size: 2.5rem; margin-bottom: 12px;">🔍</div>
                    <h3 style="margin-bottom: 8px;">No updates found</h3>
                    <p style="color: var(--text-secondary); font-size: 0.9rem;">Try adjusting your search query or filter criteria.</p>
                </div>
            `;
            return;
        }

        notesContainer.innerHTML = filtered.map(note => {
            const isSelected = selectedNote && selectedNote.id === note.id;
            const isBookmarked = savedNoteIds.has(note.id);
            const typeClass = getBadgeClass(note.type);

            return `
                <article class="note-card ${isSelected ? 'selected' : ''}" data-id="${note.id}">
                    <div class="note-header">
                        <div class="note-meta">
                            <span class="badge ${typeClass}">${escapeHtml(note.type)}</span>
                            <span class="note-date">🗓️ ${escapeHtml(note.date)}</span>
                        </div>
                    </div>

                    <div class="note-body">
                        ${note.html}
                    </div>

                    <div class="note-footer">
                        <button class="btn-select-tweet" onclick="selectNoteForTweet('${note.id}')">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            <span>${isSelected ? 'Selected in Studio' : 'Select to Tweet'}</span>
                        </button>

                        <div class="card-actions">
                            <a href="${note.link || '#'}" target="_blank" class="btn-icon-only" title="Open official documentation">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                            </a>
                            <button class="btn-icon-only ${isBookmarked ? 'bookmarked' : ''}" onclick="toggleBookmark('${note.id}')" title="${isBookmarked ? 'Remove bookmark' : 'Bookmark update'}">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                            </button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    function getBadgeClass(type) {
        const t = (type || '').toLowerCase();
        if (t.includes('feature')) return 'badge-feature';
        if (t.includes('change')) return 'badge-changed';
        if (t.includes('deprecat')) return 'badge-deprecated';
        if (t.includes('fix')) return 'badge-fix';
        return 'badge-general';
    }

    // Expose selectNoteForTweet to global window scope for inline onclick
    window.selectNoteForTweet = function(noteId) {
        const note = allNotes.find(n => n.id === noteId);
        if (!note) return;

        selectedNote = note;
        renderNotes(); // Refresh card selection highlighting

        // Show studio active state
        composerEmpty.classList.add('hidden');
        composerActive.classList.remove('hidden');

        // Populate metadata preview
        selectedTypeBadge.textContent = note.type;
        selectedTypeBadge.className = `badge ${getBadgeClass(note.type)}`;
        selectedDateEl.textContent = note.date;
        selectedSnippetEl.textContent = note.text;

        generateTweetText();
        
        // Scroll to studio on mobile if needed
        if (window.innerWidth <= 1024) {
            composerActive.scrollIntoView({ behavior: 'smooth' });
        }
    };

    window.toggleBookmark = function(noteId) {
        if (savedNoteIds.has(noteId)) {
            savedNoteIds.delete(noteId);
            showToast("Removed from saved bookmarks.");
        } else {
            savedNoteIds.add(noteId);
            showToast("Saved to bookmarks! ⭐");
        }
        localStorage.setItem('bq_saved_notes', JSON.stringify(Array.from(savedNoteIds)));
        updateCategoryCounts();
        renderNotes();
    };

    function generateTweetText() {
        if (!selectedNote) return;

        const date = selectedNote.date;
        const type = selectedNote.type;
        const link = selectedNote.link || '';
        const tags = Array.from(activeHashtags).join(' ');

        // Clean up text content
        let cleanText = selectedNote.text.replace(/\s+/g, ' ').trim();
        
        // Header prefix
        const prefix = `🚀 BigQuery ${type} Update (${date}):\n\n`;
        const suffix = `\n\n🔗 ${link}\n${tags}`;

        // Calculate max text length allowed for main message body
        const maxBodyLength = 280 - prefix.length - suffix.length;
        
        if (cleanText.length > maxBodyLength && maxBodyLength > 20) {
            cleanText = cleanText.substring(0, maxBodyLength - 3) + '...';
        }

        const fullTweet = `${prefix}${cleanText}${suffix}`;
        tweetTextArea.value = fullTweet;
        updateCharCount();
    }

    function updateCharCount() {
        const len = tweetTextArea.value.length;
        charCountEl.textContent = len;
        
        const wrapper = charCountEl.parentElement;
        wrapper.classList.remove('warning', 'error');

        if (len > 280) {
            wrapper.classList.add('error');
            btnPostTweet.disabled = true;
        } else if (len > 250) {
            wrapper.classList.add('warning');
            btnPostTweet.disabled = false;
        } else {
            btnPostTweet.disabled = false;
        }
    }

    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.remove('hidden');
        toast.style.opacity = '1';
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 300);
        }, 3000);
    }

    function escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, function(m) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[m];
        });
    }
});
