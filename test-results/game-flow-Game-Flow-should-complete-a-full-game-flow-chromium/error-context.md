# Page snapshot

```yaml
- generic [ref=e4]:
  - button "Reset" [ref=e5] [cursor=pointer]
  - generic [ref=e7]:
    - heading "Rally Club" [level=1] [ref=e8]
    - generic [ref=e9]:
      - heading "Add Players" [level=2] [ref=e10]
      - paragraph [ref=e11]: Add at least 8 players to start the game (2 courts × 4 players)
      - generic [ref=e12]:
        - textbox "Enter player name" [ref=e13]
        - button "Add" [ref=e15] [cursor=pointer]
    - generic [ref=e16]:
      - heading "Players (0)" [level=3] [ref=e17]
      - paragraph [ref=e18]: No players added yet
    - button "Start Game" [disabled] [ref=e19]
    - button "? Help" [ref=e22] [cursor=pointer]:
      - generic [ref=e23]: "?"
      - generic [ref=e24]: Help
  - generic [ref=e27]:
    - heading "Number of Courts" [level=3] [ref=e28]
    - generic [ref=e29]:
      - button "+" [ref=e30] [cursor=pointer]
      - generic [ref=e31]:
        - generic [ref=e32]: "2"
        - generic [ref=e33]: Courts
      - button "−" [ref=e34] [cursor=pointer]
    - paragraph [ref=e35]: Need at least 8 players
```