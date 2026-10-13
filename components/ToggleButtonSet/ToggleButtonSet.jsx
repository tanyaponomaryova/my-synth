import PropTypes from 'prop-types'
import React, { PureComponent } from 'react'

import ToggleButton from '../ToggleButton/ToggleButton.jsx'

export default class ToggleButtonSet extends PureComponent {
  constructor(props) {
    super(props)
  }

  handleChange = (value) => {
    const { property, handleChange } = this.props
    handleChange(property, value)
  }

  render() {
    const { name, options, value } = this.props
    const buttonElements = []

    options.forEach((option, i) => {
      buttonElements.push(
        <ToggleButton
          text={option}
          active={option === value}
          handleClick={() => this.handleChange(option)}
          key={i}
        />
      )
    })

    return (
      <div className="ToggleButtonSet">
        <div className="title">{name}</div>
        <div>{buttonElements}</div>
      </div>
    )
  }
}

ToggleButtonSet.propTypes = {
  name: PropTypes.string.isRequired,
  property: PropTypes.array.isRequired,
  value: PropTypes.string,
  options: PropTypes.array.isRequired,
  handleChange: PropTypes.func.isRequired
}
