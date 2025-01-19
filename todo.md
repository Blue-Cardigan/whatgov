#Next
[/] Discount Link
      [/] Check Stripe payments work

UI
[/] Update logo font
[/] Fix Calendar scroll
[ ] More compact citations
      [ ] Fix dodgy markdown replacement
[-] Identify images and force the same, different ones on diff days of the week
[ ] Less stark light/dark theme background colors
[ ] Debate Types listed in home/top bar
[-] Responsive design of homepage and calendar

Users
[/] Wall debate downloads
[/] Single vdb which removes and adds files every day
[-] Email people in the database
[ ] Post on SM

Summary Generation
[ ] Update prompts based on feedback
[ ] Implement prompt test script
[ ] Format questions (child debates) into single array
[ ] Translate to British English

Features
[/] Calendar search (department etc.)
[/] Update to process new Hansard schedules
[/] Update to process mp searches
[/] Search my database with keywords (better than Hansard!)
      [/] Filter by department (Use presence of minister of dep.)
[/] MP data in search results
      [/] Ensure 'Keir Starmer' matches 'Prime Minister' speaker
      [/] Include link to original debate
      [/] Save and manage mp searches
            [/] MPs added to saved_searches
            [/] MP tab in /saved
            [/] Scheduler updates
      [/] Link from mp results (contributions)
      [/] Multiple results for MP partial match
      [x] Keyword search within an MP's contributions
      [/] Recent points
      [/] MP filter in Hansard search
[/] Fix & update pdf generation
      [/] Hansard search results display debateHeader for response extids
      [/] Use DebateHeader for calendar and MP saved searches
      [/] Export header details with urls

[ ] Give assistant full debate access using functions
[ ] Implement web search
[ ] Email reminders
[ ] Newsletter
   [ ] 'This week' + searches

Bugs
[-] Address processing failure rate
      [ ] Process whole questions sessions (child debates)
      [/] Update prompt
[/] Generate daily and weekly highlights of relevant debates
[-] Ensure whole questions session processing captures all questions
[ ] Some debates have only an opening snippet of the transcript



First Launch:
[/] Remove voting and feed functionality
[-] Update the assistant vector store daily. 
      [/] Add a summary/analysis at the start of each
      [/] Ensure Member names etc. are included.
      [-] Run script daily with cron job
[/] Fix assistant citations when streaming
[/] Unique page for each debate
[/] Maintain a weekly Vector DB
[/] Update UI toggle to use assistant with weekly or all-time VDB
[/] Fix streamedResponse to show loading and remove previous content when a new search starts
[/] Include member search in hansard search
      [/] Advanced search capabilities for hansard
[/] Replace default date filter with current week, instead of current parliament
[/] Rework Calendar: 
      [/] Calendar display style
      [/] Integrate full order paper: https://services.orderpaper.parliament.uk/Help/BusinessItem
      [/] Save calendar items
[/] Implement notifications for unread debates
      [/] In app
[/] Use whatson api to complete calendar
[/] Add 'coming soon' for additional mp data
[/] Enhance pdf exports
[/] Improve responsiveness of dashboard
      [/] Full redesign
      [/] Added RSS Feeds
[-] Create endpoint and GH Action to process saved searches
      [/] Endpoint generates response and updates table for assistant
      [/] Endpoint repeats search and updates, indicating if the top result has changed
      [-] Endpoint called by cron job daily
      [/] Display calendar items with responses in main section
      [-] Endpoint searches hansard for saved events and question sessions, then generates and stores response for each
[/] Include links to original debates from saved hansard and calendar cards
      [/] Calendar
      [/] Hansard
[/] Fix mountainous lint issues
[/] Update engagement controls
[/] Update whatgov and whatgov-backend to point to main then push
[/] "This week in parliament" landing page


###OLD
Professionals
[/] Member profile search 
[/] Make search page wider (on desktop)
[/] Assistant to ask questions
[/] Save searches to dashboard
[/] AI assistant and query (prompt) builder
[/] Store searches in context
[/] Select prompt/style in assistant builder
[/] More detailed summaries for longer debates 
[/] Limit assistant usage by engagement
[/] Assistant filter editing
[/] Export saved searches to file
[/] Delete assistants
[/] Format saved searches correctly
[/] Save query-assistant pairs to rerun

[/] Save hansard searches
[/] Fix Division generation
[/] Create Openai files for divisions
[/] Add divisions to assistants
[/] Show multiple divisions in postcard/debateview if present
[ ] Term frequency tracking in hansard search



### Political Monitoring:
## Search
[/] Summaries and key points in search results
[/] Metadata from match in search results
[ ] Full report generation with Vector search/assistant

[/] Unique page for each debate
[ ] MP position tracking

MP Office data (stakeholder mapping)
"Register of interests of members' secretaries and research assistants"
+ spending

API to request ai content for a debate

Daily (live) whatsapp channel - every bill reading. Results of debate on X

Generate a daily/ weekly report tailored to demographics:
