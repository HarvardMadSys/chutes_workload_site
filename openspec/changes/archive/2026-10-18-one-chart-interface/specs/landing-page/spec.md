## MODIFIED Requirements

### Requirement: Legend buttons
In an Overview donut, the Traffic Explorer's chart or a figure card with
more than one series, each legend entry SHALL be a button that hides or
shows its series, redrawing the chart from the rows it already has. A
hidden series SHALL be shown struck through in the legend. The legend
SHALL be one tab stop, the arrow keys moving between its buttons. The
hidden set SHALL NOT be kept in the URL. A chart of fewer than two
series SHALL show no legend buttons and SHALL hide nothing, whatever was
hidden before; the Traffic Explorer's three distribution charts SHALL
follow its bars' legend by the same rule.

#### Scenario: Hiding a family in the donut
- **WHEN** the visitor clicks a family in the family mix's legend
- **THEN** that family's slice SHALL disappear and the other slices SHALL take the ring

#### Scenario: Hiding a model in a CDF card
- **WHEN** the visitor clicks "DeepSeek R1" in the input-tokens card's legend
- **THEN** that line SHALL disappear and the other lines SHALL stay as drawn

#### Scenario: One series left
- **WHEN** the visitor, with a model chosen, hides the endpoint group Chat in the legend and then chooses the endpoint Chat
- **THEN** the bars SHALL hold the one series Chat, the legend SHALL show no button, and the bars and the three distribution charts SHALL draw Chat
